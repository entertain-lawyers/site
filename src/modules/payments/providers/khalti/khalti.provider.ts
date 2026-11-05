import { IPaymentProviderService, PaymentInitiationResult, PaymentVerificationResult } from '../../core/payment.types';
import { verifyKhaltiTransaction } from './khalti.verification';
import { KhaltiInitiateRequest, KhaltiInitiateResponse } from './khalti.types';
import { env } from '@/env';

export class KhaltiProvider implements IPaymentProviderService {
  async initiatePayment(idempotencyKey: string, amount: number, productName: string, returnUrl: string): Promise<PaymentInitiationResult> {
    const secretKey = env.KHALTI_SECRET_KEY;
    if (!secretKey) throw new Error("KHALTI_SECRET_KEY is not configured");

    const baseUrl = env.NODE_ENV === 'production' 
      ? 'https://khalti.com/api/v2' 
      : 'https://dev.khalti.com/api/v2';

    // Base URL of our app for website_url
    const websiteUrl = env.NEXT_PUBLIC_APP_URL;

    const payload: KhaltiInitiateRequest = {
      return_url: returnUrl,
      website_url: websiteUrl,
      amount, // Khalti expects paisa
      purchase_order_id: idempotencyKey,
      purchase_order_name: productName,
    };

    const response = await fetch(`${baseUrl}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Khalti initiate failed: ${errorText}`);
    }

    const data = (await response.json()) as KhaltiInitiateResponse;

    return {
      providerUrl: data.payment_url,
      providerRef: data.pidx,
      idempotencyKey,
    };
  }

  async verifyPayment(payload: Record<string, unknown>, idempotencyKey: string, expectedAmount: number): Promise<PaymentVerificationResult> {
    const pidx = payload.pidx;
    if (typeof pidx !== 'string' || !pidx) throw new Error("Missing pidx in payload");

    // 1. Perform server-to-server lookup
    const lookupData = await verifyKhaltiTransaction(pidx);

    // 2. Status check comes first, so a payment the gateway has not finished
    // yet is never recorded as FAILED. Expired/refunded payments are terminal
    // failures; a user cancellation is recorded as CANCELLED; Pending/
    // Initiated stay PENDING for a later Completed callback.
    const status = typeof lookupData.status === 'string' ? lookupData.status : '';
    const terminalFailure = ['Expired', 'Refunded'].includes(status);
    const cancelled = status === 'User canceled';
    const amountMatches = lookupData.total_amount === expectedAmount;

    if (!amountMatches) {
      // Billing differs from what was recorded at initiation.
      if (cancelled || terminalFailure) {
        return {
          success: false,
          cancelled,
          providerRef: pidx,
          amountPaid: lookupData.total_amount,
          currency: "NPR",
          isComplete: false,
        };
      }
      if (status === 'Completed') {
        // A definitely-finished payment for a different amount is a real
        // billing error: never grant access, record the failure.
        return {
          success: false,
          providerRef: pidx,
          amountPaid: lookupData.total_amount,
          currency: "NPR",
          isComplete: false,
        };
      }
      // While the gateway still shows a pending/initiated state the money has
      // not finished moving: stay PENDING so a Completed callback is not
      // permanently blocked. It can never unlock the resource with a wrong
      // amount — the check above runs again on that callback.
      return {
        success: true,
        providerRef: pidx,
        amountPaid: lookupData.total_amount,
        currency: "NPR",
        isComplete: false,
      };
    }

    return {
      success: !terminalFailure && !cancelled,
      cancelled,
      providerRef: pidx,
      amountPaid: lookupData.total_amount,
      currency: "NPR",
      isComplete: lookupData.status === 'Completed',
    };
  }
}

export const khaltiProvider = new KhaltiProvider();
