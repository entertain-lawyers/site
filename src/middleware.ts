import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const nextUrl = req.nextUrl;

  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
  const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/admin');
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
