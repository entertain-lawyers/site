import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
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
