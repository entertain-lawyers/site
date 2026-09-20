import { PrismaClient, TxType, TxStatus, EntitlementSource, SubStatus } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

describe('Database Integrity Constraints', () => {
  let testUser: any;
  let testPlan: any;
  let testSub: any;
  let testResource: any;
  let testPurchase: any;

  beforeAll(async () => {
    // Create base data for testing
    testUser = await prisma.user.create({
      data: { email: `test-${Date.now()}@example.com` }
    });

    testPlan = await prisma.plan.create({
      data: { name: 'Test Plan', durationDays: 30, priceAmount: 1000 }
    });

    testSub = await prisma.subscription.create({
      data: {
        userId: testUser.id,
        planId: testPlan.id,
        status: SubStatus.ACTIVE,
        currentPeriodEnd: new Date()
      }
    });

    const semester = await prisma.semester.create({
      data: { name: 'S1', order: 1 }
    });

    const subject = await prisma.subject.create({
      data: { name: 'Sub1', semesterId: semester.id }
    });

    testResource = await prisma.resource.create({
      data: { title: 'R1', subjectId: subject.id }
    });

    testPurchase = await prisma.purchase.create({
      data: {
        userId: testUser.id,
        resourceId: testResource.id,
        amountPaid: 500
      }
    });
  });

  afterAll(async () => {
    await prisma.accessLog.deleteMany();
    await prisma.uploadIntent.deleteMany();
    await prisma.entitlement.deleteMany();
    await prisma.paymentTransaction.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.document.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('PaymentTransaction Integrity', () => {
    it('rejects type=SUBSCRIPTION with missing subscriptionId', async () => {
      await expect(prisma.paymentTransaction.create({
        data: {
          userId: testUser.id,
          provider: 'ESEWA',
          idempotencyKey: 'tx1',
          amount: 1000,
          type: TxType.SUBSCRIPTION,
          status: TxStatus.COMPLETED,
          // Missing subscriptionId
        }
      })).rejects.toThrow();
    });

    it('rejects type=PURCHASE with missing purchaseId', async () => {
      await expect(prisma.paymentTransaction.create({
        data: {
          userId: testUser.id,
          provider: 'ESEWA',
          idempotencyKey: 'tx2',
          amount: 500,
          type: TxType.PURCHASE,
          status: TxStatus.COMPLETED,
          // Missing purchaseId
        }
      })).rejects.toThrow();
    });

    it('rejects type=SUBSCRIPTION having both subscriptionId and purchaseId', async () => {
      await expect(prisma.paymentTransaction.create({
        data: {
          userId: testUser.id,
          provider: 'ESEWA',
          idempotencyKey: 'tx3',
          amount: 1000,
          type: TxType.SUBSCRIPTION,
          status: TxStatus.COMPLETED,
          subscriptionId: testSub.id,
          purchaseId: testPurchase.id, // Invalid
        }
      })).rejects.toThrow();
    });

    it('accepts valid type=SUBSCRIPTION', async () => {
      const tx = await prisma.paymentTransaction.create({
        data: {
          userId: testUser.id,
          provider: 'ESEWA',
          idempotencyKey: 'tx4',
          amount: 1000,
          type: TxType.SUBSCRIPTION,
          status: TxStatus.COMPLETED,
          subscriptionId: testSub.id,
        }
      });
      expect(tx.id).toBeDefined();
    });

    it('accepts valid type=PURCHASE', async () => {
      const tx = await prisma.paymentTransaction.create({
        data: {
          userId: testUser.id,
          provider: 'ESEWA',
          idempotencyKey: 'tx5',
          amount: 500,
          type: TxType.PURCHASE,
          status: TxStatus.COMPLETED,
          purchaseId: testPurchase.id,
        }
      });
      expect(tx.id).toBeDefined();
    });
  });

  describe('Entitlement Integrity', () => {
    it('rejects sourceType=SUBSCRIPTION with missing subscriptionId', async () => {
      await expect(prisma.entitlement.create({
        data: {
          userId: testUser.id,
          sourceType: EntitlementSource.SUBSCRIPTION,
          // Missing subscriptionId
        }
      })).rejects.toThrow();
    });

    it('rejects sourceType=PURCHASE with missing resourceId', async () => {
      await expect(prisma.entitlement.create({
        data: {
          userId: testUser.id,
          sourceType: EntitlementSource.PURCHASE,
          // Missing resourceId
        }
      })).rejects.toThrow();
    });

    it('rejects sourceType=SUBSCRIPTION having both subscriptionId and resourceId', async () => {
      await expect(prisma.entitlement.create({
        data: {
          userId: testUser.id,
          sourceType: EntitlementSource.SUBSCRIPTION,
          subscriptionId: testSub.id,
          resourceId: testResource.id, // Invalid
        }
      })).rejects.toThrow();
    });

    it('accepts valid sourceType=SUBSCRIPTION', async () => {
      const ent = await prisma.entitlement.create({
        data: {
          userId: testUser.id,
          sourceType: EntitlementSource.SUBSCRIPTION,
          subscriptionId: testSub.id,
          expiresAt: new Date(),
        }
      });
      expect(ent.id).toBeDefined();
    });

    it('accepts valid sourceType=PURCHASE', async () => {
      const ent = await prisma.entitlement.create({
        data: {
          userId: testUser.id,
          sourceType: EntitlementSource.PURCHASE,
          resourceId: testResource.id,
          // Permanent, no expiresAt
        }
      });
      expect(ent.id).toBeDefined();
    });
  });

  describe('Unique & Relational Constraints', () => {
    it('rejects duplicate permanent purchases for the same resource and user', async () => {
      // testPurchase already exists for testUser and testResource
      await expect(prisma.purchase.create({
        data: {
          userId: testUser.id,
          resourceId: testResource.id,
          amountPaid: 500
        }
      })).rejects.toThrow(/Unique constraint failed/);
    });

    it('foreign keys cannot reference nonexistent records', async () => {
      await expect(prisma.paymentTransaction.create({
        data: {
          userId: testUser.id,
          provider: 'ESEWA',
          idempotencyKey: 'tx6',
          amount: 500,
          type: TxType.PURCHASE,
          status: TxStatus.COMPLETED,
          purchaseId: 'invalid-id-here',
        }
      })).rejects.toThrow(/Foreign key constraint/);
    });
  });
});
