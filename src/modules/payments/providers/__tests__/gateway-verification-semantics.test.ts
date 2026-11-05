import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

/**
 * Regression tests for gateway verification semantics introduced by
 * 2026-11 hardening:
 *  - a customer cancel is a distinct CANCELLED outcome, never recorded FAILED
 *  - a payment the gateway has not registered yet (eSewa NOT_FOUND) does not
 *    fail the transaction — it stays PENDING and remains finalizable
 *  - an amount mismatch on a still-pending payment does not fail the
 *    transaction early (finalization stays blocked by the same check)
 */

// eSewa sandbox secret — but note vitest sets SKIP_ENV_VALIDATION=1, so the
// zod `env` proxy hands providers 'mock-value' instead of what process.env
// holds. The provider signs with whatever env.ESEWA_SECRET_KEY resolves to,
// so the tests must sign with the same value.
const ESEWA_SECRET = 'mock-value';

import { esewaProvider } from '@/modules/payments/providers/esewa/esewa.provider';
import { khaltiProvider } from '@/modules/payments/providers/khalti/khalti.provider';


const AMOUNT_PAISA = 50000; // stored paisa -> Rs 500.00

const globalFetch = global.fetch;

vi.mock('@/modules/payments/providers/khalti/khalti.verification', () => ({
  verifyKhaltiTransaction: vi.fn(),
}));

import { verifyKhaltiTransaction } from '@/modules/payments/providers/khalti/khalti.verification';

function esewaPayload(fields: Record<string, string>) {
  const signedFieldNames = Object.keys(fields).join(',');
  const message = Object.entries(fields)
    .map(([f, v]) => `${f}=${v}`)
    .join(',');
  const signature = crypto.createHmac('sha256', ESEWA_SECRET).update(message).digest('base64');
  return {
    data: Buffer.from(
      JSON.stringify({ ...fields, signed_field_names: signedFieldNames, signature })
    ).toString('base64'),
  };
}

function okFetch(json: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => json,
    text: async () => JSON.stringify(json),
  });
}

describe('eSewa verifyPayment gateway semantics', () => {
  afterEach(() => {
    global.fetch = globalFetch;
  });

  const baseFields = {
    transaction_code: '000ABC1',
    total_amount: '500.0',
    transaction_uuid: 'key-123',
    product_code: 'EPAYTEST',
  };

  it('COMPLETE with matched amount and status API confirmation is complete', async () => {
    global.fetch = okFetch({ status: 'COMPLETE', transaction_code: '000ABC1' });
    const payload = esewaPayload({ ...baseFields, status: 'COMPLETE' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(result.cancelled).toBeFalsy();
  });

  it('PENDING from the status API stays non-terminal', async () => {
    global.fetch = okFetch({ status: 'PENDING', transaction_code: '000ABC1' });
    const payload = esewaPayload({ ...baseFields, status: 'PENDING' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('REGRESSION: NOT_FOUND from the status API stays pending, not failed', async () => {
    global.fetch = okFetch({ status: 'NOT_FOUND', transaction_code: '000ABC1' });
    const payload = esewaPayload({ ...baseFields, status: 'COMPLETE' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(false);
    expect(result.cancelled).toBeFalsy();
  });

  it('CANCELED from the status API is a cancelled outcome, not FAILED', async () => {
    global.fetch = okFetch({ status: 'CANCELED', transaction_code: '000ABC1' });
    const payload = esewaPayload({ ...baseFields, status: 'PENDING' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  it('matched amount with status API CANCELED is still cancelled', async () => {
    global.fetch = okFetch({ status: 'CANCELED', transaction_code: '000ABC1' });
    const payload = esewaPayload({ ...baseFields, status: 'COMPLETE' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  it('amount mismatch on a non-terminal gateway state stays pending', async () => {
    // Status API must not be trusted as terminal while the gateway itself
    // reports a live/payment-in-progress state — finalization stays blocked
    // by the same amount check on the real Completed callback.
    global.fetch = vi.fn();
    const payload = esewaPayload({ ...baseFields, total_amount: '400.0', status: 'PENDING' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(false);
    expect(result.amountPaid).toBe(40000);
  });

  it('amount mismatch on a signed COMPLETE payload is an explicit failure', async () => {
    global.fetch = vi.fn();
    const payload = esewaPayload({ ...baseFields, total_amount: '400.0', status: 'COMPLETE' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBeFalsy();
  });

  it('REFUNDED is a failure, not a cancel', async () => {
    global.fetch = okFetch({ status: 'REFUNDED', transaction_code: '000ABC1' });
    const payload = esewaPayload({ ...baseFields, status: 'COMPLETE' });

    const result = await esewaProvider.verifyPayment(payload, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBeFalsy();
  });

  it('rejects an invalid signature', async () => {
    const payload = esewaPayload({ ...baseFields, status: 'COMPLETE' });
    // Corrupt the signed amount so the recomputed signature does not match.
    const decoded = JSON.parse(Buffer.from(payload.data, 'base64').toString());
    decoded.total_amount = '999.0';
    global.fetch = vi.fn();

    await expect(
      esewaProvider.verifyPayment({ data: Buffer.from(JSON.stringify(decoded)).toString('base64') }, 'key-123', AMOUNT_PAISA)
    ).rejects.toThrow(/Invalid signature/);
  });
});

describe('Khalti verifyPayment gateway semantics', () => {
  beforeEach(() => {
    (verifyKhaltiTransaction as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  function lookup(overrides: Record<string, unknown> = {}) {
    (verifyKhaltiTransaction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      total_amount: AMOUNT_PAISA,
      status: 'Completed',
      ...overrides,
    });
  }

  it('Completed with the expected amount is complete', async () => {
    lookup();
    const result = await khaltiProvider.verifyPayment({ pidx: 'pidx-1' }, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(result.cancelled).toBeFalsy();
  });

  it('Pending stays non-terminal', async () => {
    lookup({ status: 'Pending' });
    const result = await khaltiProvider.verifyPayment({ pidx: 'pidx-1' }, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('REGRESSION: amount mismatch on a Pending payment stays pending, not failed', async () => {
    lookup({ status: 'Pending', total_amount: 100 }); // wrong amount, still live
    const result = await khaltiProvider.verifyPayment({ pidx: 'pidx-1' }, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('amount mismatch on a Completed payment is an explicit failure', async () => {
    lookup({ status: 'Completed', total_amount: 100 });
    const result = await khaltiProvider.verifyPayment({ pidx: 'pidx-1' }, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBeFalsy();
  });

  it('User canceled is a cancelled outcome, not FAILED', async () => {
    lookup({ status: 'User canceled' });
    const result = await khaltiProvider.verifyPayment({ pidx: 'pidx-1' }, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  it('Expired is a failure, not a cancel', async () => {
    lookup({ status: 'Expired' });
    const result = await khaltiProvider.verifyPayment({ pidx: 'pidx-1' }, 'key-123', AMOUNT_PAISA);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBeFalsy();
  });

  it('a completed payment for a different txn is bound by the pidx check in the service', async () => {
    // Documented contract: PaymentCoreService rejects callbacks whose pidx
    // does not match the providerRef stored at initiation.
    lookup();
    const result = await khaltiProvider.verifyPayment({ pidx: 'attacker-pidx' }, 'key-123', AMOUNT_PAISA);
    expect(result.providerRef).toBe('attacker-pidx');
  });
});

describe('cross-checks (regression guards)', () => {
  afterEach(() => {
    global.fetch = globalFetch;
  });

  it('eSewa: amount mismatch on a CANCELED callback is cancelled, never success', async () => {
    global.fetch = vi.fn();
    const payload = esewaPayload({
      transaction_code: '000ABC1',
      total_amount: '400.0',
      transaction_uuid: 'key-123',
      product_code: 'EPAYTEST',
      status: 'CANCELED',
    } as Record<string, string>);
    const result = await esewaProvider.verifyPayment(payload, 'key-123', 50000);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });
});
