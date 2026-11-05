export class PaymentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class PaymentVerificationError extends PaymentError {
  constructor(message: string) {
    super(message, 'VERIFICATION_FAILED');
    this.name = 'PaymentVerificationError';
  }
}

/** The gateway confirms the customer abandoned the checkout (user cancel). */
export class PaymentCancelledError extends PaymentError {
  constructor(message = 'Payment cancelled.') {
    super(message, 'CANCELLED');
    this.name = 'PaymentCancelledError';
  }
}

/** The gateway says the payment exists but is not finished yet — retryable. */
export class PaymentPendingError extends PaymentError {
  constructor(message = 'Payment is still processing.') {
    super(message, 'PENDING');
    this.name = 'PaymentPendingError';
  }
}

export class IdempotencyError extends PaymentError {
  constructor(message: string) {
    super(message, 'ALREADY_PROCESSED');
    this.name = 'IdempotencyError';
  }
}
