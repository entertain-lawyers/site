import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";

const { auth } = NextAuth(authConfig);

type RedirectRule = { source: string; destination: string; statusCode: number };

/**
 * Admin-managed redirects are read through a tiny in-process cache so ordinary
 * page views do not hit the database. A new rule becomes visible within the
 * TTL (or immediately on a fresh server instance).
 */
const REDIRECT_CACHE_TTL_MS = 10_000;
let redirectCache: { rules: RedirectRule[]; expiresAt: number } | null = null;

function normalizePath(path: string): string {
  let value = path.trim();
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1 && value.endsWith('/')) value = value.replace(/\/+$/, '');
  return value || '/';
}

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

/** Areas where a redirect must never interfere with auth or the app shell. */
const REDIRECT_EXEMPT_PREFIXES = [
  '/api',
  '/_next',
  '/admin',
  '/dashboard',
  '/read',
  '/payment',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

function shouldCheckRedirect(pathname: string): boolean {
  if (pathname === '/') return false;
  return !REDIRECT_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
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
    const role = auth?.user?.role;
    if (role !== "ADMIN" && role !== "EDITOR") {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  // Admin-managed redirects for old or changed URLs. Exact status codes are
  // preserved, which matters for search engines.
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    shouldCheckRedirect(nextUrl.pathname)
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
