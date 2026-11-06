import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  markTransactionFailed: vi.fn(),
  markTransactionCancelled: vi.fn(),
  finalizeSuccessfulPayment: vi.fn(),
  verifyPayment: vi.fn(),
  initiatePayment: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentTransaction: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock('../payment.repository', () => ({
  createPendingTransaction: vi.fn(),
  markTransactionFailed: mocks.markTransactionFailed,
  markTransactionCancelled: mocks.markTransactionCancelled,
  finalizeSuccessfulPayment: mocks.finalizeSuccessfulPayment,
}));

import { PaymentCoreService } from '../payment.service';
import {
  IdempotencyError,
  PaymentCancelledError,
  PaymentPendingError,
} from '../payment.errors';

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    idempotencyKey: 'idem-1',
    provider: 'ESEWA',
    amount: 50000,
    status: 'PENDING',
    type: 'PURCHASE',
    targetId: 'resource-1',
    providerRef: null,
    userId: 'user-1',
    ...overrides,
  };
}

describe('verifyAndFinalizePayment retries for non-pending transactions', () => {
  let service: PaymentCoreService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentCoreService();
    service.registerProvider('ESEWA', {
      initiatePayment: mocks.initiatePayment,
      verifyPayment: mocks.verifyPayment,
    });
  });

  it('raises PaymentCancelledError on the first callback for a CANCELLED transaction', async () => {
    mocks.findUnique.mockResolvedValue(transaction({ status: 'CANCELLED' }));

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).rejects.toBeInstanceOf(PaymentCancelledError);

    // A CANCELLED row is already terminal; verification must not run again and
    // must not overwrite the recorded state.
    expect(mocks.verifyPayment).not.toHaveBeenCalled();
    expect(mocks.markTransactionCancelled).not.toHaveBeenCalled();
    expect(mocks.markTransactionFailed).not.toHaveBeenCalled();
  });

  it('raises PaymentCancelledError again on repeated callbacks for the same CANCELLED transaction', async () => {
    mocks.findUnique.mockResolvedValue(transaction({ status: 'CANCELLED' }));

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).rejects.toBeInstanceOf(PaymentCancelledError);
    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).rejects.toBeInstanceOf(PaymentCancelledError);

    expect(mocks.findUnique).toHaveBeenCalledTimes(2);
    expect(mocks.verifyPayment).not.toHaveBeenCalled();
    expect(mocks.markTransactionCancelled).not.toHaveBeenCalled();
  });

  it('keeps COMPLETED retries idempotent and successful', async () => {
    mocks.findUnique.mockResolvedValue(transaction({ status: 'COMPLETED' }));

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).resolves.toEqual({ success: true, message: 'Already processed' });

    expect(mocks.verifyPayment).not.toHaveBeenCalled();
    expect(mocks.finalizeSuccessfulPayment).not.toHaveBeenCalled();
  });

  it('keeps FAILED retries rejected with IdempotencyError', async () => {
    mocks.findUnique.mockResolvedValue(transaction({ status: 'FAILED' }));

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).rejects.toBeInstanceOf(IdempotencyError);

    expect(mocks.verifyPayment).not.toHaveBeenCalled();
    expect(mocks.markTransactionFailed).not.toHaveBeenCalled();
  });

  it('processes a PENDING transaction normally when verification succeeds', async () => {
    mocks.findUnique.mockResolvedValue(transaction());
    mocks.verifyPayment.mockResolvedValue({
      success: true,
      providerRef: 'gateway-ref-1',
      amountPaid: 50000,
      currency: 'NPR',
      isComplete: true,
    });

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).resolves.toEqual({ success: true });

    expect(mocks.verifyPayment).toHaveBeenCalledWith({}, 'idem-1', 50000);
    expect(mocks.finalizeSuccessfulPayment).toHaveBeenCalledWith(
      'tx-1',
      'gateway-ref-1',
      'user-1',
      'PURCHASE',
      'resource-1',
      undefined
    );
  });

  it('keeps a still-pending gateway payment retryable', async () => {
    mocks.findUnique.mockResolvedValue(transaction());
    mocks.verifyPayment.mockResolvedValue({
      success: true,
      providerRef: 'gateway-ref-1',
      amountPaid: 50000,
      currency: 'NPR',
      isComplete: false,
    });

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).rejects.toBeInstanceOf(PaymentPendingError);

    expect(mocks.markTransactionFailed).not.toHaveBeenCalled();
    expect(mocks.markTransactionCancelled).not.toHaveBeenCalled();
    expect(mocks.finalizeSuccessfulPayment).not.toHaveBeenCalled();
  });

  it('records a PENDING transaction as CANCELLED when the gateway reports a customer cancel', async () => {
    mocks.findUnique.mockResolvedValue(transaction());
    mocks.verifyPayment.mockResolvedValue({
      success: false,
      providerRef: '',
      amountPaid: 0,
      currency: 'NPR',
      isComplete: false,
      cancelled: true,
    });

    await expect(
      service.verifyAndFinalizePayment('ESEWA', {}, 'idem-1')
    ).rejects.toBeInstanceOf(PaymentCancelledError);

    expect(mocks.markTransactionCancelled).toHaveBeenCalledWith('tx-1');
    expect(mocks.markTransactionFailed).not.toHaveBeenCalled();
  });
});
