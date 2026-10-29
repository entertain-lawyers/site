'use server';

import { createSafeAction } from '@/lib/safe-action';
import { paymentCoreService } from './core/payment.service';
import { PaymentProvider } from './core/payment.types';
import { env } from '@/env';

// e.g. URL that the provider will redirect back to
const getBaseUrl = () => env.NEXT_PUBLIC_APP_URL;

export const initiatePurchaseAction = createSafeAction(async (args: { resourceId: string, provider: PaymentProvider }, session) => {
  if (!session.userId) throw new Error('Unauthorized');
  if (env.PAYMENTS_ENABLED === 'false') throw new Error('Payments are temporarily unavailable.');
  if (process.env.VERCEL_ENV === 'preview') throw new Error('Payments are disabled in Preview mode.');
  
  const returnUrl = `${getBaseUrl()}/api/payments/callback/${args.provider.toLowerCase()}`;
  
  const result = await paymentCoreService.initiatePurchasePayment(
    session.userId,
    args.resourceId,
    args.provider,
    returnUrl
  );

  return {
    redirectUrl: result.providerUrl,
    providerData: result.providerData ?? null,
  };
}, { rateLimitKey: 'payment_init', rateLimitMax: 10, rateLimitWindow: 60 });

export const initiateSubscriptionAction = createSafeAction(async (args: { planId: string, provider: PaymentProvider }, session) => {
  if (!session.userId) throw new Error('Unauthorized');
  if (env.PAYMENTS_ENABLED === 'false') throw new Error('Payments are temporarily unavailable.');
  if (process.env.VERCEL_ENV === 'preview') throw new Error('Payments are disabled in Preview mode.');
  
  const returnUrl = `${getBaseUrl()}/api/payments/callback/${args.provider.toLowerCase()}`;
  
  const result = await paymentCoreService.initiateSubscriptionPayment(
    session.userId,
    args.planId,
    args.provider,
    returnUrl
  );

  return {
    redirectUrl: result.providerUrl,
    providerData: result.providerData ?? null,
  };
}, { rateLimitKey: 'payment_init', rateLimitMax: 10, rateLimitWindow: 60 });
