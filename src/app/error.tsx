'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed,
    // but do not expose it to the user interface.
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center transition-colors duration-300">
      <div className="bg-surface p-8 md:p-12 rounded-2xl border border-border shadow-soft max-w-lg w-full">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-fluid-h2 font-extrabold text-navy dark:text-white mb-2 tracking-tight">Something went wrong</h1>
        <h2 className="text-fluid-h3 font-bold text-text-secondary mb-4">केही गलत भयो</h2>
        
        <p className="text-text-muted mb-8 leading-relaxed text-fluid-base">
          We experienced an unexpected issue. Please try again or return to the homepage.<br/>
          हामीले एउटा अप्रत्याशित समस्या फेला पार्यौं। कृपया फेरि प्रयास गर्नुहोस् वा गृह पृष्ठमा फर्कनुहोस्।
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex justify-center items-center px-6 py-3.5 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent hover:bg-accent-hover transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent active:scale-[0.98] hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5"
          >
            Try Again / फेरि प्रयास गर्नुहोस्
          </button>
          <Link
            href="/"
            className="inline-flex justify-center items-center px-6 py-3.5 border border-border text-sm font-bold rounded-xl text-navy dark:text-white bg-surface hover:bg-surface-alt transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border active:scale-[0.98]"
          >
            Go Home / गृह पृष्ठमा जानुहोस्
          </Link>
        </div>
      </div>
    </div>
  );
}
