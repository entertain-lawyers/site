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

  async verifyPayment(payload: any, idempotencyKey: string, expectedAmount: number): Promise<PaymentVerificationResult> {
    const pidx = payload.pidx;
    if (!pidx) throw new Error("Missing pidx in payload");

    // 1. Perform server-to-server lookup
    const lookupData = await verifyKhaltiTransaction(pidx);

    // 2. Validate amount matches what we expect
    if (lookupData.total_amount !== expectedAmount) {
      return {
        success: false,
        providerRef: pidx,
        amountPaid: lookupData.total_amount,
        currency: "NPR",
        isComplete: false,
      };
    }

    // 3. Status check
    const isComplete = lookupData.status === 'Completed';

    return {
      success: true,
      providerRef: pidx,
      amountPaid: lookupData.total_amount,
      currency: "NPR",
      isComplete,
    };
  }
}

export const khaltiProvider = new KhaltiProvider();
