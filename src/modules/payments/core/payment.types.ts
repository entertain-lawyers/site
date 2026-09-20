// Core Payment Types

export type PaymentProvider = "ESEWA" | "KHALTI";

export type PaymentTransactionType = "SUBSCRIPTION" | "PURCHASE";

// Explicit state machine statuses
export type PaymentTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface PaymentInitiationResult {
  providerUrl: string;
  providerData?: Record<string, string>; // For form POSTs (like eSewa)
  providerRef?: string; // If generated early (like Khalti pidx)
  idempotencyKey: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  providerRef: string;
  amountPaid: number;
  currency: string;
  isComplete: boolean; // e.g. eSewa status COMPLETE, Khalti Completed
}

export interface IPaymentProviderService {
  initiatePayment(
    idempotencyKey: string,
    amount: number,
    productName: string,
    returnUrl: string
  ): Promise<PaymentInitiationResult>;

  verifyPayment(
    payload: any, // The parsed query/body from the callback
    idempotencyKey: string,
    expectedAmount: number
  ): Promise<PaymentVerificationResult>;
}
