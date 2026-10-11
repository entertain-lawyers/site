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
    if (expectedSignature !== data.signature) {
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
    // Be careful with float comparisons in JS, parse as float to compare reliably
    if (parseFloat(String(totalAmount)) !== parseFloat(expectedAmountRs)) {
      return {
        success: false,
        providerRef: transactionCode,
        amountPaid: parseFloat(String(totalAmount)) * 100, // back to paisa
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
      return {
        success: false,
        providerRef: transactionCode,
        amountPaid: parseFloat(String(totalAmount)) * 100,
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
