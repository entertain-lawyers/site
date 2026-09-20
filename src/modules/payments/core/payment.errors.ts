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

export class IdempotencyError extends PaymentError {
  constructor(message: string) {
    super(message, 'ALREADY_PROCESSED');
    this.name = 'IdempotencyError';
  }
}
