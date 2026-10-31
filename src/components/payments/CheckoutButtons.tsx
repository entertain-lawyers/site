'use client';

import { useState } from 'react';
import { initiatePurchaseAction } from '@/modules/payments/payment.actions';
import { submitPaymentForm } from '@/lib/payment-form';
import { AnimatePresence, Appear } from '@/components/motion/primitives';

interface CheckoutButtonsProps {
  resourceId: string;
  priceAmount: number;
  currency: string;
  paymentsEnabled?: boolean;
}

export function CheckoutButtons({ resourceId, priceAmount, currency, paymentsEnabled = true }: CheckoutButtonsProps) {
  const [loading, setLoading] = useState<'ESEWA' | 'KHALTI' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (provider: 'ESEWA' | 'KHALTI') => {
    setLoading(provider);
    setError(null);
    try {
      const result = await initiatePurchaseAction({ resourceId, provider });
      if (result.success) {
        const { redirectUrl, providerData } = result.data;
        if (providerData) {
          submitPaymentForm(redirectUrl, providerData);
        } else {
          window.location.href = redirectUrl;
        }
      } else {
        setError(result.error || 'Failed to initiate payment');
        setLoading(null);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col space-y-3 w-full">
      <AnimatePresence initial={false}>
      {error && (
        <Appear key="error">
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md text-left">
          {error}
        </div>
        </Appear>
      )}
      </AnimatePresence>
      
      {paymentsEnabled === false ? (
        <div className="p-4 text-center text-sm font-medium text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
          Payments are temporarily unavailable.
        </div>
      ) : (
        <>
          <button
            onClick={() => handleCheckout('ESEWA')}
            disabled={loading !== null}
            className="w-full flex justify-center items-center px-4 py-3 min-h-[44px] border border-border rounded-xl shadow-sm bg-surface hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
          >
            {loading === 'ESEWA' ? (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing...</span>
            ) : (
              <div className="bg-[#1E1E1E] dark:bg-transparent px-3 py-1.5 rounded-md shadow-sm dark:shadow-none">
                <img src="/images/esewa-logo.png" alt="eSewa" className="h-5 object-contain" />
              </div>
            )}
          </button>

          <button
            onClick={() => handleCheckout('KHALTI')}
            disabled={loading !== null}
            className="w-full flex justify-center items-center px-4 py-3 min-h-[44px] border border-border rounded-xl shadow-sm bg-surface hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
          >
            {loading === 'KHALTI' ? (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing...</span>
            ) : (
              <svg viewBox="0 0 120 40" className="h-6" xmlns="http://www.w3.org/2000/svg">
                {/* Khalti Shield */}
                <path d="M 8 5 L 32 5 L 30 22 C 28 30, 20 35, 20 35 C 20 35, 12 30, 10 22 Z" fill="#5C2D91" stroke="#5C2D91" strokeWidth="4" strokeLinejoin="round" />
                {/* Letter K */}
                <path d="M 15 11 L 18 11 L 18 17 L 24 11 L 28 11 L 21 18 L 28 27 L 24 27 L 18 20 L 18 27 L 15 27 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                {/* Text 'khalti' */}
                <text x="40" y="27" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="24" className="fill-[#5C2D91] dark:fill-white" letterSpacing="-0.5">khalti</text>
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  );
}
