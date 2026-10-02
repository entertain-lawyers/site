'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail, resendVerificationEmail } from '@/modules/auth/auth.actions';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailQuery);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendMessage, setResendMessage] = useState({ type: '', text: '' });

  const handleResend = async () => {
    if (!email) {
      setError('Email is required to resend code');
      return;
    }
    setResending(true);
    setError('');
    setResendMessage({ type: '', text: '' });

    try {
      const res = await resendVerificationEmail({ email });
      if (!res.success) throw new Error(res.error);
      setResendMessage({ type: 'success', text: 'A new code has been sent!' });
    } catch (err: any) {
      setResendMessage({ type: 'error', text: err.message || 'Failed to resend code.' });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const res = await verifyEmail({ email, token });
      if (!res.success) {
        throw new Error(res.error);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">Verified!</h2>
        <p className="text-text-secondary">Your email has been verified. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative z-10 mb-8">
        <h2 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Verify Email
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          Enter the 6-digit code sent to your email
        </p>
      </div>

      <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50/80 dark:bg-red-900/20 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-900/30 backdrop-blur-sm">
            {error}
          </div>
        )}

        {resendMessage.text && (
          <div className={`p-4 rounded-2xl text-sm font-medium border backdrop-blur-sm ${
            resendMessage.type === 'success'
              ? 'bg-green-50/80 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-900/30'
              : 'bg-red-50/80 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
          }`}>
            {resendMessage.text}
          </div>
        )}

        <div className="space-y-5">
          {!emailQuery && (
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-navy dark:text-white mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3.5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium"
                placeholder="you@example.com"
              />
            </div>
          )}

          <div>
            <label htmlFor="token" className="block text-sm font-bold text-navy dark:text-white mb-2">
              6-Digit Code
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="appearance-none block w-full px-4 py-3.5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium text-center tracking-[0.5em] text-2xl"
              placeholder="000000"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 shadow-[0_0_15px_rgba(var(--color-accent),0.4)] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify Account'
            )}
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-text-secondary">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email}
              className="font-bold text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </p>
        </div>
      </form>
    </>
  );
}
