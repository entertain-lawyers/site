'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { register } from '@/modules/auth/auth.actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Lock } from 'lucide-react';
import {
  safeCallbackUrl,
  STUDY_MATERIAL_LOGIN_MESSAGE,
  STUDY_MATERIAL_LOGIN_REASON,
} from '@/lib/callback-url';

/** Same-origin absolute URL → path; anything else → null (rejected). */
function toRelative(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  // Untrusted query input: only same-site paths survive (no open redirect).
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));
  const isStudyMaterial = searchParams.get('reason') === STUDY_MATERIAL_LOGIN_REASON;
  const errorParam = searchParams.get('error');
  const codeParam = searchParams.get('code');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    codeParam === 'UnverifiedEmail' || errorParam === 'UnverifiedEmail'
      ? 'Please verify your email address before logging in.'
      : errorParam === 'CredentialsSignin'
      ? 'Invalid email or password.'
      : errorParam === 'OAuthAccountNotLinked'
      ? 'This email is already registered with a password. Please sign in with your email and password.'
      : errorParam
      ? 'An error occurred during authentication.'
      : null
  );
  const [success, setSuccess] = useState<string | null>(null);

  // Someone who is already signed in goes straight to where they were headed.
  // /api/auth/session is validated against the database, so an invalidated
  // session gets the form instead of a redirect loop.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (!cancelled && session?.user) window.location.replace(callbackUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [callbackUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();

    try {
      const result = await signIn('credentials', {
        email: trimmedEmail,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!result) {
        setError('An unexpected error occurred during authentication.');
        setLoading(false);
        return;
      }

      if (result.error) {
        if (result.error === 'CredentialsSignin' || (result as any).code === 'credentials') {
          setError('Invalid email or password.');
        } else if (result.error === 'UnverifiedEmail' || (result as any).code === 'UnverifiedEmail') {
          setError('Please verify your email address before logging in.');
        } else if (result.error === 'LoginRateLimited' || (result as any).code === 'LoginRateLimited') {
          setError('Too many login attempts. Please wait a few minutes and try again.');
        } else {
          setError('Invalid email or password.');
        }
        setLoading(false);
        return;
      }

      // NextAuth already restricts result.url to this origin; validate it
      // again so neither branch can send the user off-site.
      window.location.href = safeCallbackUrl(result.url ? toRelative(result.url) : null, callbackUrl);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await register({ email, password });
      if (result.success) {
        setSuccess('Account created. Redirecting to verification...');
        setTimeout(() => {
          window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        }, 1000);
      } else {
        setError(result.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block group mb-6">
          <div className="relative w-[200px] h-16 mx-auto overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
            <Image
              src="/logo.jpg"
              alt="Entertain Lawyers"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="sr-only">Entertain Lawyers</span>
        </Link>
        {isStudyMaterial && (
          <div
            role="status"
            className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm font-semibold text-navy dark:text-white"
          >
            <Lock className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {STUDY_MATERIAL_LOGIN_MESSAGE}
          </div>
        )}
        <h1 className="text-fluid-h2 font-bold text-navy dark:text-white tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
                className="font-bold text-accent hover:text-accent-hover transition-colors"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="font-bold text-accent hover:text-accent-hover transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-soft border border-border sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
              {(codeParam === 'UnverifiedEmail' || errorParam === 'UnverifiedEmail') && (
                <div className="mt-2">
                  <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="font-bold underline hover:text-red-900">
                    Verify email now
                  </Link>
                </div>
              )}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
              {success}
            </div>
          )}

          <form
            className="space-y-6"
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
          >
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-navy dark:text-white placeholder-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition-colors text-base sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-text-secondary">
                  Password
                </label>
                {mode === 'login' && (
                  <Link href="/forgot-password" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-navy dark:text-white placeholder-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition-colors text-base sm:text-sm pr-12"
                  placeholder={mode === 'register' ? 'Minimum 8 characters' : '••••••••'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)] active:scale-[0.98]"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                    ? 'Sign In to Continue'
                    : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-text-muted font-medium uppercase tracking-wider">
                  Or
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  signIn('google', { callbackUrl, redirect: true });
                }}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-border rounded-xl shadow-sm bg-background text-sm font-bold text-navy dark:text-white hover:bg-surface-alt hover:border-text-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all duration-300"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
