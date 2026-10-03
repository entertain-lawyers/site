'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role, ResourceType } from '@prisma/client';

const createResourceSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  subjectId: z.string().uuid(),
  isPremium: z.boolean(),
  priceAmount: z.number().optional(),
  type: z.nativeEnum(ResourceType).optional(),
  unitId: z.string().uuid().optional(),
});

export const createResourceAction = createSafeAction(async (args: {
  title: string;
  description?: string;
  subjectId: string;
  isPremium: boolean;
  priceAmount?: number;
  type?: ResourceType;
  unitId?: string;
  content?: string;
}, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const isPremium = args.type === ResourceType.LAW_NOTE || args.type === ResourceType.CASE_LAW;
  const priceAmount = isPremium ? (args.priceAmount || 0) : null;
  const currency = isPremium ? 'NPR' : undefined;

  const resource = await prisma.resource.create({
    data: {
      title: args.title,
      subjectId: args.subjectId,
      isPremium,
      priceAmount,
      currency,
      type: args.type || ResourceType.LAW_NOTE,
      unitId: args.unitId || null,
    }
  });

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entityType: 'RESOURCE',
        entityId: resource.id,
        details: { title: resource.title, type: resource.type }
      }
    });
  }

  return { resourceId: resource.id };
});

const deleteResourceSchema = z.object({
  id: z.string().uuid(),
});

export const deleteResourceAction = createSafeAction(async (args: z.infer<typeof deleteResourceSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const resource = await prisma.resource.findUnique({ where: { id: args.id } });

  if (session.role === Role.EDITOR ) {
    throw new Error('Unauthorized: You can only delete resources you created.');
  }

  // 1. Check dependencies to prevent destructive loss of history.
  const dependencies = await prisma.$transaction([
    prisma.purchase.count({ where: { resourceId: args.id } }),
    prisma.entitlement.count({ where: { resourceId: args.id } }),
    prisma.accessLog.count({ where: { resourceId: args.id } }),
  ]);

  const [purchaseCount, entitlementCount, accessCount] = dependencies;

  if (purchaseCount > 0 || entitlementCount > 0 || accessCount > 0) {
    throw new Error('This resource has existing purchases, entitlements, or access logs and cannot be physically deleted. Please Archive it instead.');
  }

  // Safe to delete if we reached here (e.g. genuinely disposable draft).
  // We can clean up ephemeral UploadIntents safely.
  await prisma.uploadIntent.deleteMany({ where: { resourceId: args.id } });

  // NOTE: We do not delete the document if it has access logs, but we already checked accessCount is 0!
  // However, a document could be shared? No, it's 1:1 with resource usually.
  // We will leave the Document orphaned for future async GC, ensuring total safety.

  await prisma.resource.delete({
    where: { id: args.id }
  });

  if (resource && session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entityType: 'RESOURCE',
        entityId: resource.id,
        details: { title: resource.title, type: resource.type }
      }
    });
  }

  return { success: true };
});

const updateResourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  subjectId: z.string().uuid(),
  isPremium: z.boolean(),
  priceAmount: z.number().optional(),
  type: z.nativeEnum(ResourceType),
  unitId: z.string().uuid().optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export const updateResourceAction = createSafeAction(async (args: z.infer<typeof updateResourceSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  // NOTE: Ownership validation is NOT enforced for EDITING resources, as per business rules.
  // Any Editor can maintain/edit content to prevent orphaned data when staff leaves.

  const isPremium = args.type === ResourceType.LAW_NOTE || args.type === ResourceType.CASE_LAW;
  const priceAmount = isPremium ? (args.priceAmount || 0) : null;
  const currency = isPremium ? 'NPR' : undefined;

  const resource = await prisma.resource.update({
    where: { id: args.id },
    data: {
      title: args.title,
      subjectId: args.subjectId,
      isPremium,
      priceAmount,
      currency,
      type: args.type,
      unitId: args.unitId || null,
                  status: args.status as any,
    }
  });

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'RESOURCE',
        entityId: resource.id,
        details: { title: resource.title, type: resource.type, status: resource.status }
      }
    });
  }

  return { success: true };
});
