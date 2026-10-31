'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/modules/auth/auth.actions';
import Link from 'next/link';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailQuery);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword({ email, token, newPassword });
      if (!res.success) {
        throw new Error(res.error);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Invalid code or something went wrong.');
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
        <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">Password Reset!</h2>
        <p className="text-text-secondary">Your password has been changed successfully. Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative z-10 mb-8">
        <h2 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Reset Password
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          Enter your 6-digit code and a new password
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

          <div>
            <label htmlFor="newPassword" className="block text-sm font-bold text-navy dark:text-white mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3.5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium pr-12"
                placeholder="••••••••"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-navy dark:text-white mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3.5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium pr-12"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div>
          <MotionButton
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-[background-color,border-color,color,box-shadow,opacity] duration-300 shadow-[0_0_15px_rgba(var(--color-accent),0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </MotionButton>
        </div>
      </form>
    </>
  );
}
