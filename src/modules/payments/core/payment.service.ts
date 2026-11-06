import { prisma } from '@/lib/prisma';
import { IPaymentProviderService, PaymentProvider } from './payment.types';
import { createPendingTransaction, finalizeSuccessfulPayment, markTransactionCancelled, markTransactionFailed } from './payment.repository';
import { IdempotencyError, PaymentCancelledError, PaymentPendingError, PaymentVerificationError, PaymentError } from './payment.errors';
import { esewaProvider } from '../providers/esewa/esewa.provider';
import { khaltiProvider } from '../providers/khalti/khalti.provider';

export class PaymentCoreService {
  private providers: Map<PaymentProvider, IPaymentProviderService> = new Map();

  constructor() {
    this.registerProvider('ESEWA', esewaProvider);
    this.registerProvider('KHALTI', khaltiProvider);
  }

  registerProvider(name: PaymentProvider, service: IPaymentProviderService) {
    this.providers.set(name, service);
  }

  getProvider(name: PaymentProvider): IPaymentProviderService {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider ${name} not registered.`);
    return provider;
  }

  async initiateSubscriptionPayment(userId: string, planId: string, providerName: PaymentProvider, returnUrl: string) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Plan not found");
    if (plan.priceAmount <= 0) throw new Error("Cannot pay for a free plan");

    const idempotencyKey = crypto.randomUUID();
    const provider = this.getProvider(providerName);

    // Create pending transaction
    await createPendingTransaction({
      userId,
      provider: providerName,
      idempotencyKey,
      amount: plan.priceAmount,
      type: 'SUBSCRIPTION',
      targetId: planId,
    });

    const result = await provider.initiatePayment(idempotencyKey, plan.priceAmount, `Subscription - ${plan.name}`, returnUrl);
    
    // Update providerRef if generated early
    if (result.providerRef) {
      await prisma.paymentTransaction.updateMany({
        where: { idempotencyKey },
        data: { providerRef: result.providerRef }
      });
    }
    return result;
  }

  async initiatePurchasePayment(userId: string, resourceId: string, providerName: PaymentProvider, returnUrl: string) {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.status !== 'PUBLISHED' || !resource.isPremium || !resource.priceAmount) {
      throw new Error("Invalid resource for purchase");
    }

    const idempotencyKey = crypto.randomUUID();
    const provider = this.getProvider(providerName);

    // Create pending transaction
    await createPendingTransaction({
      userId,
      provider: providerName,
      idempotencyKey,
      amount: resource.priceAmount,
      type: 'PURCHASE',
      targetId: resourceId,
    });

    const result = await provider.initiatePayment(idempotencyKey, resource.priceAmount, `Purchase - ${resource.title}`, returnUrl);
    
    if (result.providerRef) {
      await prisma.paymentTransaction.updateMany({
        where: { idempotencyKey },
        data: { providerRef: result.providerRef }
      });
    }
    return result;
  }

  async verifyAndFinalizePayment(
    providerName: PaymentProvider,
    payload: Record<string, unknown>,
    idempotencyKey: string
  ) {
    // 1. Look up the transaction in our DB
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { idempotencyKey }
    });

    if (!transaction) throw new PaymentError("Transaction not found", "NOT_FOUND");

    // The transaction was created for exactly one gateway. Without this check a
    // valid payment at gateway B can finalize a pending transaction that was
    // opened at gateway A, unlocking an item without paying that gateway.
    if (transaction.provider !== providerName) {
      throw new PaymentVerificationError("Payment provider does not match this transaction.");
    }

    if (transaction.status === 'COMPLETED') {
      return { success: true, message: "Already processed" };
    }
    // A cancelled transaction was abandoned by the customer (or cancelled at
    // the gateway). Callbacks can be retried and the gateway may keep posting
    // the same cancellation; report it as cancelled every time instead of
    // falling through to the generic "already processed" idempotency error.
    if (transaction.status === 'CANCELLED') {
      throw new PaymentCancelledError(
        "The payment was cancelled. You can start the payment again any time."
      );
    }
    if (transaction.status !== 'PENDING') {
      throw new IdempotencyError("Transaction already processed or not pending");
    }

    const provider = this.getProvider(providerName);

    // 2. Delegate to provider specific verification logic
    const verifyResult = await provider.verifyPayment(payload, idempotencyKey, transaction.amount);

    if (!verifyResult.success) {
      // Record the customer's own abandonment as CANCELLED, everything the
      // provider reports as a genuine failure as FAILED.
      if (verifyResult.cancelled) {
        await markTransactionCancelled(transaction.id);
        throw new PaymentCancelledError(
          "The payment was cancelled. You can start the payment again any time."
        );
      }
      // Explicit failure: amount mismatch on a finished payment, or the
      // provider reports an expired/refunded payment.
      await markTransactionFailed(transaction.id);
      throw new PaymentVerificationError("Payment verification failed.");
    }

    // Bind the callback to this transaction. Khalti returns the pidx we stored
    // at initiation as providerRef; the callback's purchase_order_id is
    // attacker-controlled, so without this check a completed payment for
    // another order could be replayed to unlock this one.
    if (
      transaction.providerRef &&
      verifyResult.providerRef !== transaction.providerRef
    ) {
      throw new PaymentVerificationError(
        "Payment reference does not match this transaction."
      );
    }

    if (!verifyResult.isComplete) {
      // The provider says the payment is still pending (e.g. Khalti "Pending",
      // eSewa "PENDING"/"AMBIGUOUS"). Keep the transaction PENDING instead of
      // failing it: the provider may send a COMPLETED callback moments later,
      // and a FAILED row would make that callback permanently unusable.
      throw new PaymentPendingError(
        "Your payment is still processing at the gateway. It may complete shortly — check your dashboard before paying again."
      );
    }

    if (verifyResult.currency !== "NPR") {
      await markTransactionFailed(transaction.id);
      throw new PaymentVerificationError("Invalid currency.");
    }

    if (!transaction.targetId) {
      throw new PaymentError("Transaction is missing a target resource/plan ID", "INVALID_TRANSACTION");
    }

    // 3. Perform Atomic Finalization
    try {
      let durationDays: number | undefined;
      if (transaction.type === 'SUBSCRIPTION') {
        const plan = await prisma.plan.findUnique({ where: { id: transaction.targetId } });
        if (!plan) throw new Error("Plan not found");
        durationDays = plan.durationDays;
      }
      
      await finalizeSuccessfulPayment(
        transaction.id,
        verifyResult.providerRef,
        transaction.userId,
        transaction.type,
        transaction.targetId,
        durationDays
      );
    } catch (e) {
      if (e instanceof IdempotencyError) {
        // A concurrent request touched this row. Only report success if the
        // transaction really is COMPLETED; otherwise the caller would be sent
        // to the success page without receiving an entitlement.
        const current = await prisma.paymentTransaction.findUnique({
          where: { id: transaction.id },
          select: { status: true },
        });

        if (current?.status === 'COMPLETED') {
          return { success: true, message: "Already processed" };
        }

        throw new PaymentVerificationError(
          "Payment could not be finalized. Please contact support if you were charged."
        );
      }
      throw e;
    }

    return { success: true };
  }
}

export const paymentCoreService = new PaymentCoreService();
