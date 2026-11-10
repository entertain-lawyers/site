/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { isRedirectExempt, normalizePath } from "@/lib/redirect-rules";
import { studyMaterialLoginUrl } from "@/lib/callback-url";
import { buildCsp } from "@/lib/csp";

const { auth } = NextAuth(authConfig);

type RedirectRule = { source: string; destination: string; statusCode: number };

/**
 * The admin-managed redirect rules are read through a tiny in-process cache so
 * ordinary page views do not hit the database. A new rule becomes visible
 * within the TTL (or immediately on a fresh server instance).
 */
const REDIRECT_CACHE_TTL_MS = 300_000;
const REDIRECT_CACHE_FAILURE_TTL_MS = 30_000;
let redirectCache: { rules: RedirectRule[]; expiresAt: number } | null = null;

async function getActiveRedirects(): Promise<RedirectRule[]> {
  if (redirectCache && redirectCache.expiresAt > Date.now()) {
    return redirectCache.rules;
  }

  try {
    const rules = await prisma.redirect.findMany({
      where: { isActive: true },
      select: { source: true, destination: true, statusCode: true },
    });
    redirectCache = { rules, expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS };
    return rules;
  } catch (error) {
    console.error("Could not load redirects in middleware.", error);
    // Hold the empty result briefly so a database outage does not turn every
    // page view into a failed middleware query. Only negative results are
    // cached this way, so valid rules are never served stale.
    redirectCache = { rules: [], expiresAt: Date.now() + REDIRECT_CACHE_FAILURE_TTL_MS };
    return [];
  }
}

/* ------------------------------------------------------------------------ */
/* Content-Security-Policy                                                   */
/*                                                                          */
/* Every HTML document request receives a freshly generated nonce. Next.js   */
/* reads the CSP from the forwarded request headers and adds the nonce to    */
/* its own framework scripts; hand-authored inline scripts (theme init,      */
/* JSON-LD) read the same nonce via headers(). Redirect responses only carry */
/* the response header (their target page generates a fresh request).        */
/* ------------------------------------------------------------------------ */

type CspInjection = {
  nonce: string;
  requestHeaders: Headers;
  /** Stamps the CSP response header on any outgoing response. */
  applyTo: (response: NextResponse) => NextResponse;
};

function isDocumentRequest(req: any): boolean {
  return req.method === "GET" || req.method === "HEAD";
}

function makeCspInjection(req: any): CspInjection {
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js mirrors the script nonce from the request CSP into the framework
  // scripts it injects during rendering.
  requestHeaders.set("Content-Security-Policy", csp);

  return {
    nonce,
    requestHeaders,
    applyTo(response: NextResponse) {
      response.headers.set("Content-Security-Policy", csp);
      return response;
    },
  };
}

/** Continues routing while forwarding the CSP request headers to the renderer. */
function continueWithCsp(req: any, csp: CspInjection): NextResponse {
  const response = NextResponse.next({ request: { headers: csp.requestHeaders } });
  return csp.applyTo(response);
}

const authMiddleware = auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const nextUrl = req.nextUrl;
  const isReader = nextUrl.pathname.startsWith('/read');
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');

  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    if (isReader) {
      return NextResponse.redirect(new URL(studyMaterialLoginUrl(callbackUrl), nextUrl));
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // Middleware Role Gating (UX only - Server Actions enforce true security)
  if (isAdminRoute) {
    const authUser = req.auth as { user?: { role?: string } } | null;
    const role = authUser?.user?.role?.toUpperCase();
    if (role !== "ADMIN" && role !== "EDITOR") {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  // NextResponse.next() on its own does NOT forward modified request headers
  // to the renderer; the nonce/CSP headers only reach it when they are passed
  // back explicitly. Without this the framework scripts get a nonce but the
  // hand-authored inline scripts (theme init, JSON-LD) do not, so CSP blocks
  // them on every protected route (/admin, /dashboard, /read).
  return NextResponse.next({ request: { headers: req.headers } });
});

export default async function proxy(req: any, event: any) {
  const nextUrl = req.nextUrl;
  const csp = isDocumentRequest(req) ? makeCspInjection(req) : null;
  const withCsp = (response: NextResponse) => (csp ? csp.applyTo(response) : response);

  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
  if (isAuthRoute) {
    if (csp) return continueWithCsp(req, csp);
    return NextResponse.next();
  }

  // Study listings (/study, /semesters) are public so visitors can browse
  // titles. Opening the material itself needs an account: the secure reader
  // is gated here, and /resources/[id] applies a type-aware check
  // server-side (Law Notes, Case Laws and Old Questions).
  const isReader = nextUrl.pathname.startsWith('/read');
  const isProtectedRoute =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/admin') ||
    isReader;

  if (isProtectedRoute) {
    if (!csp) return (authMiddleware as any)(req, event);

    // Hand the auth wrapper a request that already carries the CSP nonce
    // headers, so its plain next() keeps them for the renderer.
    const authedReq = new NextRequest(req as NextRequest, {
      headers: csp.requestHeaders as any,
    });
    const response = await (authMiddleware as any)(authedReq, event);
    return csp.applyTo(response);
  }

  // Admin-managed redirects for old or changed URLs. Exact status codes are
  // preserved, which matters for search engines.
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    !isRedirectExempt(nextUrl.pathname)
  ) {
    const normalized = normalizePath(nextUrl.pathname);
    const rules = await getActiveRedirects();
    const rule = rules.find((candidate) => normalizePath(candidate.source) === normalized);

    if (rule) {
      let destination = rule.destination;

      // Keep campaign parameters and search queries on relative targets.
      if (destination.startsWith("/") && nextUrl.search && !destination.includes("?")) {
        destination += nextUrl.search;
      }

      return withCsp(NextResponse.redirect(new URL(destination, nextUrl), rule.statusCode));
    }
  }

  // Route-based language enforcement
  const response = continueWithCsp(req, csp ?? makeCspInjection(req));

  // Environment-aware security headers:
  // Strictly enforce HSTS and upgrade-insecure-requests on live production HTTPS domains,
  // while omitting them on localhost/127.0.0.1 to avoid breaking local HTTP development.
  const host = req.headers.get("host") || nextUrl.host || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  if (!isLocal && process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  const currentLocale = req.cookies.get("NEXT_LOCALE")?.value;

  if (nextUrl.pathname.startsWith("/nepali")) {
    if (currentLocale !== "ne") {
      response.cookies.set("NEXT_LOCALE", "ne", { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
    }
  } else if (currentLocale === "ne") {
    // If the visitor was previously browsing /nepali but has navigated to an English route
    // (any non-/nepali path like /, /news, /blogs, /resources, etc.), reset the locale cookie to 'en'.
    // Visitors who never set Nepali (the vast majority) receive NO Set-Cookie header,
    // preserving Vercel edge CDN caching.
    response.cookies.set("NEXT_LOCALE", "en", { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
