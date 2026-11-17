'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordResetOtp, requestPasswordReset } from '@/modules/auth/auth.actions';
import Link from 'next/link';
import Image from 'next/image';
import { KeyRound, ArrowLeft, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

export default function VerifyOtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email] = useState(() => {
    if (initialEmail) return initialEmail;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('reset_email') || '';
    }
    return '';
  });

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [verified, setVerified] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // If no email could be resolved, redirect to forgot-password
  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
    }
  }, [email, router]);

  // 60-second countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = useCallback(async (codeToVerify?: string) => {
    const code = codeToVerify ?? otp;
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');
    setResendStatus(null);
    setLoading(true);

    try {
      const res = await verifyPasswordResetOtp({ email, otp: code });
      if (!res.success) {
        throw new Error(res.error || 'Invalid or expired verification code.');
      }
      if (!res.data?.resetToken) {
        throw new Error('Invalid or expired verification code.');
      }

      setVerified(true);

      // Save token in sessionStorage as fallback
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reset_token', res.data.resetToken);
      }

      // Smooth transition to Reset Password screen
      setTimeout(() => {
        router.push(
          `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(res.data.resetToken)}`
        );
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email, otp, router]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');

    // Auto-verify when all 6 digits are typed
    if (value.length === 6) {
      handleVerify(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setOtp(pasted);
      setError('');
      if (pasted.length === 6) {
        handleVerify(pasted);
      }
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    setResendStatus(null);

    try {
      const res = await requestPasswordReset({ email });
      if (!res.success) {
        throw new Error(res.error || 'Failed to resend code.');
      }
      setResendStatus({
        type: 'success',
        text: 'A fresh 6-digit verification code has been sent to your email.',
      });
      setCountdown(60);
      setOtp('');
      inputRef.current?.focus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code.';
      setResendStatus({ type: 'error', text: message });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  if (verified) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">Code Verified!</h2>
        <p className="text-text-secondary text-sm">Redirecting to create your new password...</p>
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
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Verify Reset Code
        </h1>
        <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
          Enter the 6-digit code sent to{' '}
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

        <AnimatePresence initial={false}>
          {resendStatus && (
            <Appear key="resendStatus">
              <div
                role="status"
                className={`p-4 rounded-xl text-sm font-medium border ${
                  resendStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:border-green-900/60 dark:text-green-300'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300'
                }`}
              >
                {resendStatus.text}
              </div>
            </Appear>
          )}
        </AnimatePresence>

        <div>
          <label htmlFor="otp" className="block text-sm font-semibold text-text-secondary text-center mb-2">
            6-Digit Verification Code
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={handleOtpChange}
              onPaste={handlePaste}
              className="appearance-none block w-full px-4 py-4 bg-surface-alt border border-border rounded-2xl text-navy dark:text-white placeholder-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition-colors font-mono text-center text-3xl font-bold tracking-[0.5em] select-all shadow-inner"
              placeholder="••••••"
              aria-label="6-Digit Verification Code"
            />
          </div>
          <p className="mt-2 text-xs text-text-muted text-center">
            Valid for 5 minutes • Maximum 5 attempts
          </p>
        </div>

        <div>
          <MotionButton
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-[background-color,border-color,color,box-shadow,opacity] duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying Code...
              </>
            ) : (
              'Verify & Continue'
            )}
          </MotionButton>
        </div>

        {/* Resend Cooldown Section */}
        <div className="text-center pt-2">
          {countdown > 0 ? (
            <p className="text-xs text-text-muted font-medium">
              Didn&apos;t receive the code? Resend available in{' '}
              <span className="font-bold text-accent">{countdown}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending new code...' : 'Resend Verification Code'}
            </button>
          )}
        </div>

        <div className="text-center pt-2 border-t border-border">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-navy dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Use a different email address
          </Link>
        </div>
      </form>
    </>
  );
}
