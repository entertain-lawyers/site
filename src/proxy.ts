import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { isRedirectExempt, normalizePath } from "@/lib/redirect-rules";

const { auth } = NextAuth(authConfig);

type RedirectRule = { source: string; destination: string; statusCode: number };

/**
 * Admin-managed redirects are read through a tiny in-process cache so ordinary
 * page views do not hit the database. A new rule becomes visible within the
 * TTL (or immediately on a fresh server instance).
 */
const REDIRECT_CACHE_TTL_MS = 10_000;
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
    return [];
  }
}

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const nextUrl = req.nextUrl;

  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
  // Law notes, case laws and old questions are member content: the study
  // listing and the secure reader require an account. Resource detail pages
  // apply the same type-aware check server-side (see /resources/[id]).
  const studyType = nextUrl.searchParams.get('type');
  const isStudyContent =
    nextUrl.pathname.startsWith('/study') &&
    !!studyType &&
    ['LAW_NOTE', 'CASE_LAW', 'OLD_QUESTION'].includes(studyType);
  const isProtectedRoute =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/admin') ||
    nextUrl.pathname.startsWith('/read') ||
    isStudyContent;
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute && !isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // Middleware Role Gating (UX only - Server Actions enforce true security)
  if (isAdminRoute) {
    const auth = req.auth as { user?: { role?: string } } | null;
    const role = auth?.user?.role?.toUpperCase();
    if (role !== "ADMIN" && role !== "EDITOR") {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  // Admin-managed redirects for old or changed URLs. Exact status codes are
  // preserved, which matters for search engines.
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    !isRedirectExempt(nextUrl.pathname)
  ) {
    const normalized = normalizePath(nextUrl.pathname);
    const rules = await getActiveRedirects();
    const rule = rules.find((candidate) => normalizePath(candidate.source) === normalized);

    if (rule) {
      let destination = rule.destination;

      // Keep campaign parameters and search queries on relative targets.
      if (destination.startsWith('/') && nextUrl.search && !destination.includes('?')) {
        destination += nextUrl.search;
      }

      return NextResponse.redirect(new URL(destination, nextUrl), rule.statusCode);
    }
  }

  // Route-based language enforcement
  const response = NextResponse.next();

  // Environment-aware security headers:
  // Strictly enforce HSTS and upgrade-insecure-requests on live production HTTPS domains,
  // while omitting them on localhost/127.0.0.1 to avoid breaking local HTTP development.
  const host = req.headers.get('host') || nextUrl.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (!isLocal && process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    const existingCsp = response.headers.get('content-security-policy') || '';
    if (existingCsp && !existingCsp.includes('upgrade-insecure-requests')) {
      response.headers.set('content-security-policy', `${existingCsp.trim()} upgrade-insecure-requests;`);
    }
  }

  const currentLocale = req.cookies.get('NEXT_LOCALE')?.value;

  if (nextUrl.pathname.startsWith('/nepali')) {
    if (currentLocale !== 'ne') {
      response.cookies.set('NEXT_LOCALE', 'ne', { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
    }
  } else if (nextUrl.pathname === '/') {
    // Only force English on the absolute root path to avoid mixed content.
    // Allow other routes like /contact to persist the language cookie.
    if (currentLocale !== 'en') {
      response.cookies.set('NEXT_LOCALE', 'en', { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
    }
  }

  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
