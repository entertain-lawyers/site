'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@/modules/auth/auth.actions';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await requestPasswordReset({ email: trimmedEmail });
      if (!res.success) {
        throw new Error(res.error || 'Failed to send verification code. Please try again.');
      }

      // Store in session storage as fallback for the verify page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reset_email', trimmedEmail);
      }

      router.push(`/forgot-password/verify?email=${encodeURIComponent(trimmedEmail)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Forgot Password
        </h1>
        <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
          Enter your registered email address and we&apos;ll send you a 6-digit verification code.
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

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Mail className="w-5 h-5" aria-hidden="true" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full pl-11 pr-4 py-3 bg-surface-alt border border-border rounded-xl text-navy dark:text-white placeholder-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition-colors text-base sm:text-sm font-medium"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div>
          <MotionButton
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-[background-color,border-color,color,box-shadow,opacity] duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </MotionButton>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </>
  );
}
