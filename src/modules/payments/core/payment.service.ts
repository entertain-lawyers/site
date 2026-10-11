import { prisma } from '@/lib/prisma';
import { IPaymentProviderService, PaymentProvider } from './payment.types';
import { createPendingTransaction, finalizeSuccessfulPayment, markTransactionFailed } from './payment.repository';
import { IdempotencyError, PaymentVerificationError, PaymentError } from './payment.errors';
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
    if (!resource || !resource.isPremium || !resource.priceAmount) {
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
    if (transaction.status === 'COMPLETED') {
      return { success: true, message: "Already processed" };
    }
    if (transaction.status !== 'PENDING') {
      throw new IdempotencyError("Transaction already processed or not pending");
    }

    const provider = this.getProvider(providerName);

    // 2. Delegate to provider specific verification logic
    const verifyResult = await provider.verifyPayment(payload, idempotencyKey, transaction.amount);

    if (!verifyResult.success || !verifyResult.isComplete) {
      // Transition to FAILED safely
      await markTransactionFailed(transaction.id);
      throw new PaymentVerificationError("Payment verification failed or not complete.");
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
        // Safe to ignore, already finalized by concurrent request
        return { success: true, message: "Already processed" };
      }
      throw e;
    }

    return { success: true };
  }
}

export const paymentCoreService = new PaymentCoreService();
