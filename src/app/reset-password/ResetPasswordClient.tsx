'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordWithToken } from '@/modules/auth/auth.actions';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Lock, CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [email] = useState(() => {
    if (emailParam) return emailParam;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('reset_email') || '';
    }
    return '';
  });

  const [token] = useState(() => {
    if (tokenParam) return tokenParam;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('reset_token') || '';
    }
    return '';
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasValidSession = Boolean(email && token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordWithToken({
        email,
        token,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to reset password. Please start over.');
      }

      // Clear session storage on success
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('reset_email');
        sessionStorage.removeItem('reset_token');
      }

      setSuccess(true);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired reset session.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Missing or expired token state
  if (!hasValidSession) {
    return (
      <div className="text-center py-4 relative z-10">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">Reset Session Expired</h2>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          Your password reset session is missing or has expired. For your security, please request a new verification code.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-colors shadow-md"
        >
          Request New Code
        </Link>
        <div className="mt-4">
          <Link href="/login" className="text-xs font-semibold text-text-muted hover:text-accent transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (success) {
    return (
      <div className="text-center py-6 relative z-10">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-navy dark:text-white mb-2 tracking-tight">
          Password Reset Complete!
        </h2>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed max-w-xs mx-auto">
          Your password has been securely updated. Any existing active sessions have been signed out.
        </p>
        <Link
          href="/login?reset=success"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-colors shadow-md"
        >
          <span>Sign In to Your Account</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-text-muted mt-4">
          Redirecting to sign in automatically...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative z-10 mb-8">
        <Link href="/" className="inline-block group mb-6">
          <div className="relative w-[180px] h-14 mx-auto overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
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
        <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Create New Password
        </h1>
        <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
          Enter a strong new password for{' '}
          <span className="font-semibold text-navy dark:text-white break-all">{email}</span>.
        </p>
      </div>

      <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
        <AnimatePresence initial={false}>
          {error && (
            <Appear key="error">
              <div
                role="alert"
                className="p-4 bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300 text-sm rounded-xl font-medium"
              >
                {error}
              </div>
            </Appear>
          )}
        </AnimatePresence>

        <div className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-text-secondary mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-navy dark:text-white placeholder-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition-colors text-base sm:text-sm font-medium pr-12"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-navy dark:hover:text-white transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-secondary mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-surface-alt border border-border rounded-xl text-navy dark:text-white placeholder-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition-colors text-base sm:text-sm font-medium pr-12"
                placeholder="Re-enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-navy dark:hover:text-white transition-colors focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">Passwords do not match</p>
            )}
          </div>
        </div>

        <div>
          <MotionButton
            type="submit"
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-[background-color,border-color,color,box-shadow,opacity] duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating Password...
              </>
            ) : (
              'Update Password'
            )}
          </MotionButton>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs font-semibold text-text-muted hover:text-accent transition-colors"
          >
            Cancel and return to sign in
          </Link>
        </div>
      </form>
    </>
  );
}
