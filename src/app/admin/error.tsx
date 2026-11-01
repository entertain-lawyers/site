'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-zinc-900 p-8 shadow-lg text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100 dark:border-red-900/30">
          <AlertCircle className="w-8 h-8" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-extrabold text-navy dark:text-white tracking-tight mb-2">
          Admin Page Error
        </h1>
        <p className="text-sm font-medium text-text-secondary dark:text-zinc-400 mb-6 leading-relaxed">
          An unexpected error occurred while loading this admin section. Try reloading the page or return to the dashboard.
        </p>

        {error.digest && (
          <div className="mb-6 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-3 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            Error digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try Again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border border-black/10 dark:border-white/10 text-navy dark:text-white bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
