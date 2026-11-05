import { IPaymentProviderService, PaymentInitiationResult, PaymentVerificationResult } from '../../core/payment.types';
import crypto from 'crypto';

import { env } from '@/env';

export class EsewaProvider implements IPaymentProviderService {
  private getSecretKey(): string {
    const key = env.ESEWA_SECRET_KEY;
    if (!key) throw new Error("ESEWA_SECRET_KEY is not configured");
    return key;
  }

  private getMerchantCode(): string {
    const code = env.ESEWA_MERCHANT_ID; // In env.ts it's ESEWA_MERCHANT_ID
    if (!code) throw new Error("ESEWA_MERCHANT_ID is not configured");
    return code;
  }

  private getBaseUrl(): string {
    return env.NODE_ENV === 'production'
      ? 'https://epay.esewa.com.np'
      : 'https://rc-epay.esewa.com.np';
  }

  private generateSignature(message: string): string {
    const hmac = crypto.createHmac('sha256', this.getSecretKey());
    hmac.update(message);
    return hmac.digest('base64');
  }

  private signaturesMatch(expected: string, received: unknown): boolean {
    if (typeof received !== 'string') return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async initiatePayment(idempotencyKey: string, amount: number, productName: string, returnUrl: string): Promise<PaymentInitiationResult> {
    const merchantCode = this.getMerchantCode();
    // eSewa expects amount in rupees, but we store in paisa. Wait! The DB has minor units (paisa).
    // eSewa ePay v2 accepts `amount`, `tax_amount`, `total_amount` in rupees.
    const amountRs = (amount / 100).toFixed(2);
    const message = `total_amount=${amountRs},transaction_uuid=${idempotencyKey},product_code=${merchantCode}`;
    const signature = this.generateSignature(message);

    const providerUrl = `${this.getBaseUrl()}/api/epay/main/v2/form`;

    const providerData = {
      amount: amountRs,
      tax_amount: "0",
      total_amount: amountRs,
      transaction_uuid: idempotencyKey,
      product_code: merchantCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: returnUrl,
      failure_url: returnUrl, // Typically we pass the same or a failure route, we handle both safely
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    };

    return {
      providerUrl,
      providerData,
      idempotencyKey,
    };
  }

  async verifyPayment(payload: Record<string, unknown>, idempotencyKey: string, expectedAmount: number): Promise<PaymentVerificationResult> {
    // eSewa returns a base64 encoded string in `data` query param
    const encodedData = payload.data;
    if (typeof encodedData !== 'string' || !encodedData) throw new Error("Missing data payload from eSewa");
    // Bound the decode: base64 expands by 3/4, so this rejects oversized bodies
    // before allocating the JSON object.
    if (encodedData.length > 16_384) throw new Error("eSewa payload too large");

    const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
    const data = JSON.parse(decodedString) as Record<string, unknown>;

    // {
    //   "transaction_code": "000AMB2",
    //   "status": "COMPLETE",
    //   "total_amount": "100.0",
    //   "transaction_uuid": "...",
    //   "product_code": "EPAYTEST",
    //   "signed_field_names": "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    //   "signature": "..."
    // }

    // 1. Verify response signature
    const signedFieldNames = data.signed_field_names;
    if (typeof signedFieldNames !== 'string' || !signedFieldNames) {
      throw new Error("Invalid signed field names from eSewa");
    }
    const fields = signedFieldNames.split(',');
    const messageToSign = fields.map(f => `${f}=${String(data[f])}`).join(',');
    
    const expectedSignature = this.generateSignature(messageToSign);
    if (!this.signaturesMatch(expectedSignature, data.signature)) {
      throw new Error("Invalid signature from eSewa callback");
    }

    if (data.transaction_uuid !== idempotencyKey) {
      throw new Error("Transaction UUID mismatch");
    }

    const transactionCode = typeof data.transaction_code === 'string' ? data.transaction_code : '';

    // eSewa amount is in Rupees
    const expectedAmountRs = (expectedAmount / 100).toFixed(2);
    const totalAmount = data.total_amount;
    if (typeof totalAmount !== 'string' && typeof totalAmount !== 'number') {
      throw new Error("Invalid total amount from eSewa");
    }
    const amountMismatch =
      parseFloat(String(totalAmount)) !== parseFloat(expectedAmountRs);
    const amountPaid = parseFloat(String(totalAmount)) * 100; // back to paisa

    const gatewayStatus =
      typeof data.status === 'string' ? data.status.toUpperCase() : '';
    // User cancel is recorded as CANCELLED, never FAILED.
    const cancelled = ['CANCELED', 'CANCELLED'].includes(gatewayStatus);
    // NOT_FOUND deliberately IS NOT terminal here: it also occurs while the
    // gateway has not yet registered the transaction, and marking the row
    // FAILED would make a later COMPLETE callback permanently unusable.
    const terminalFailure = ['FAILED', 'REFUNDED'].includes(gatewayStatus);

    if (amountMismatch) {
      if (gatewayStatus !== 'COMPLETE') {
        // Non-terminal billing state: keep the transaction PENDING so a later
        // Completed callback stays usable. Finalization is blocked by this
        // same amount check, so a wrong amount can never unlock the resource.
        return {
          success: !(terminalFailure || cancelled),
          cancelled,
          providerRef: transactionCode,
          amountPaid,
          currency: "NPR",
          isComplete: false,
        };
      }
      // A signed COMPLETE payload for a different amount is a real billing
      // error (never grant access).
      return {
        success: false,
        providerRef: transactionCode,
        amountPaid,
        currency: "NPR",
        isComplete: false,
      };
    }

    // 2. Perform official server-to-server eSewa transaction status verification API
    const statusCheckUrl = `${this.getBaseUrl()}/api/epay/transaction/status/?product_code=${this.getMerchantCode()}&total_amount=${expectedAmountRs}&transaction_uuid=${idempotencyKey}`;

    const statusResponse = await fetch(statusCheckUrl, { method: 'GET' });
    if (!statusResponse.ok) {
       throw new Error(`eSewa status check failed with status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    // Output is usually { "status": "COMPLETE", "transaction_code": "...", "transaction_uuid": "...", "total_amount": 100 }

    if (statusData.status !== 'COMPLETE') {
      // PENDING/AMBIGUOUS are transient: leave the transaction PENDING so a
      // later COMPLETE callback can still grant access. Only explicitly
      // canceled transactions are recorded as CANCELLED.
      const status =
        typeof statusData.status === 'string' ? statusData.status.toUpperCase() : '';
      // NOT_FOUND deliberately IS NOT terminal: the status API also returns it
      // while the transaction is not yet registered; failing the row there
      // would make a later COMPLETE callback permanently unusable.
      const cancelledStatus = ['CANCELED', 'CANCELLED'].includes(status);
      const terminalFailureStatus = ['FAILED', 'REFUNDED'].includes(status);

      return {
        success: !terminalFailureStatus && !cancelledStatus,
        cancelled: cancelledStatus,
        providerRef: transactionCode,
        amountPaid,
        currency: "NPR",
        isComplete: false,
      };
    }

    return {
      success: true,
      providerRef: transactionCode,
      amountPaid: expectedAmount,
      currency: "NPR",
      isComplete: true,
    };
  }
}

export const esewaProvider = new EsewaProvider();
