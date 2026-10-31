'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@/modules/auth/auth.actions';
import Link from 'next/link';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await requestPasswordReset({ email });
      if (!res.success) {
        throw new Error(res.error);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">Check your email</h2>
        <p className="text-text-secondary">If an account exists, we've sent a 6-digit code. Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative z-10 mb-8">
        <h2 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Forgot Password
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          Enter your email to receive a reset code
        </p>
      </div>

      <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
        <AnimatePresence initial={false}>
        {error && (
          <Appear key="error">
          <div className="bg-red-50/80 dark:bg-red-900/20 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-900/30 backdrop-blur-sm">
            {error}
          </div>
          </Appear>
        )}
        </AnimatePresence>

        <div className="space-y-5">
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
        </div>

        <div>
          <MotionButton
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-[background-color,border-color,color,box-shadow,opacity] duration-300 shadow-[0_0_15px_rgba(var(--color-accent),0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </MotionButton>
        </div>

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm font-bold text-accent hover:text-accent-hover">
            Back to login
          </Link>
        </div>
      </form>
    </>
  );
}
