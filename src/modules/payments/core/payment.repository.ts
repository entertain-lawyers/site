import { prisma } from '@/lib/prisma';
import { PaymentTransactionStatus } from './payment.types';
import { IdempotencyError } from './payment.errors';
import { PaymentTransaction, Subscription, Purchase, Entitlement } from '@prisma/client';

export async function createPendingTransaction(data: {
  userId: string;
  provider: string;
  idempotencyKey: string;
  amount: number;
  type: 'SUBSCRIPTION' | 'PURCHASE';
  targetId: string;
  subscriptionId?: string | null;
  purchaseId?: string | null;
  providerRef?: string | null;
}) {
  return await prisma.paymentTransaction.create({
    data: {
      userId: data.userId,
      provider: data.provider,
      idempotencyKey: data.idempotencyKey,
      amount: data.amount,
      type: data.type,
      targetId: data.targetId,
      status: 'PENDING',
      subscriptionId: data.subscriptionId,
      purchaseId: data.purchaseId,
      providerRef: data.providerRef,
    },
  });
}

export async function markTransactionFailed(transactionId: string) {
  // Safe transition to FAILED only if it's PENDING
  await prisma.paymentTransaction.updateMany({
    where: { id: transactionId, status: 'PENDING' },
    data: { status: 'FAILED' },
  });
}

export async function markTransactionCancelled(transactionId: string) {
  // Safe transition to CANCELLED only if it's PENDING
  await prisma.paymentTransaction.updateMany({
    where: { id: transactionId, status: 'PENDING' },
    data: { status: 'FAILED' },
  });
}

/**
 * Atomically finalizes a successful payment.
 * Applies Compare-And-Swap to the PaymentTransaction and creates/updates Access Entitlements in ONE transaction.
 */
export async function finalizeSuccessfulPayment(
  transactionId: string,
  providerRef: string,
  userId: string,
  type: 'SUBSCRIPTION' | 'PURCHASE',
  targetId: string, // either planId (for subscription) or resourceId (for purchase)
  durationDays?: number // for subscriptions
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock the row to prevent concurrent processing
    const lockedRows = await tx.$queryRaw<any[]>`
      SELECT id FROM "PaymentTransaction" 
      WHERE id = ${transactionId} AND status = 'PENDING' 
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new IdempotencyError("Transaction already processed or not pending.");
    }

    if (type === 'SUBSCRIPTION') {
      if (!durationDays) throw new Error("Duration days required for subscription.");

      // Check for active subscription for THIS USER and THIS PLAN
      const existingSub = await tx.subscription.findFirst({
        where: {
          userId,
          planId: targetId,
          status: 'ACTIVE',
          currentPeriodEnd: { gt: new Date() }, // Still active
        },
        orderBy: { currentPeriodEnd: 'desc' }
      });

      let subId: string;
      if (existingSub) {
        // Renewal: add time to existing end date
        const newEnd = new Date(existingSub.currentPeriodEnd.getTime() + durationDays * 24 * 60 * 60 * 1000);
        await tx.subscription.update({
          where: { id: existingSub.id },
          data: { currentPeriodEnd: newEnd }
        });
        subId = existingSub.id;
      } else {
        // New or expired: start from now
        const newEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        const newSub = await tx.subscription.create({
          data: {
            userId,
            planId: targetId,
            status: 'ACTIVE',
            currentPeriodEnd: newEnd,
          }
        });
        subId = newSub.id;
        
        // Create Entitlement for new subscription
        await tx.entitlement.create({
          data: {
            userId,
            sourceType: 'SUBSCRIPTION',
            subscriptionId: subId,
          }
        });
      }

      // Link payment to subscription and mark completed
      await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: { 
          status: 'COMPLETED',
          providerRef,
          subscriptionId: subId 
        }
      });

    } else if (type === 'PURCHASE') {
      // Create Purchase (resourceId)
      // Check if already purchased (enforce uniqueness constraint safely)
      let purchase = await tx.purchase.findUnique({
        where: {
          userId_resourceId: {
            userId,
            resourceId: targetId,
          }
        }
      });

      if (!purchase) {
        // Find amount from transaction
        const pt = await tx.paymentTransaction.findUnique({ where: { id: transactionId } });
        purchase = await tx.purchase.create({
          data: {
            userId,
            resourceId: targetId,
            amountPaid: pt!.amount,
            currency: pt!.currency,
          }
        });

        // Create Entitlement
        await tx.entitlement.create({
          data: {
            userId,
            sourceType: 'PURCHASE',
            resourceId: targetId,
          }
        });
      }

      // Link payment to purchase and mark completed
      await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: { 
          status: 'COMPLETED',
          providerRef,
          purchaseId: purchase.id 
        }
      });
    }

    return true; // Success
  });
}
