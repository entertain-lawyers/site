'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ContentStatus, Role, ResourceType } from '@prisma/client';
import { isRecordInUseError, isRecordNotFoundError } from '@/lib/prisma-errors';

const createResourceSchema = z.object({
  title: z.string().min(3),
  description: z.string().max(5000).optional(),
  content: z.string().max(200_000).optional(),
  subjectId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  isPremium: z.boolean(),
  priceAmount: z.number().int().nonnegative().optional(),
  type: z.nativeEnum(ResourceType).optional(),
  unitId: z.string().uuid().optional(),
}).refine(data => {
  if (data.type === ResourceType.OLD_QUESTION) {
    return !!data.semesterId;
  }
  return !!data.subjectId;
}, {
  message: "Old Questions require a semester, other resources require a subject",
});

export const createResourceAction = createSafeAction(async (args: z.infer<typeof createResourceSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = createResourceSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0]?.message || 'please check the form'}`);
  }

  const input = parsed.data;
  // `type` is optional, and the create below defaults it to LAW_NOTE, so the
  // editor check must apply that default too.
  const resourceType = input.type ?? ResourceType.LAW_NOTE;
  if (
    session.role === Role.EDITOR &&
    (resourceType === ResourceType.LAW_NOTE || resourceType === ResourceType.CASE_LAW)
  ) {
    throw new Error('Only admins can create law notes and case laws');
  }
  // Honour the admin's Premium checkbox instead of deriving it from the type;
  // "Write Note" resources can be free or paid.
  const isPremium = input.isPremium;
  const priceAmount = isPremium ? (input.priceAmount ?? 0) : null;
  const currency = isPremium ? 'NPR' : undefined;

  const resourceId = await prisma.$transaction(async (tx) => {
    const resource = await tx.resource.create({
      data: {
        title: input.title,
        content: input.content?.trim() || null,
        metaDesc: input.description?.trim() || null,
        subjectId: input.subjectId || null,
        semesterId: input.semesterId || null,
        isPremium,
        priceAmount,
        currency,
        type: resourceType,
        unitId: input.unitId || null,
      }
    });

    if (session.userId) {
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'CREATE',
          entityType: 'RESOURCE',
          entityId: resource.id,
          details: { title: resource.title, type: resource.type }
        }
      });
    }

    return resource.id;
  });

  return { resourceId };
});

const deleteResourceSchema = z.object({
  id: z.string().uuid(),
});

export const deleteResourceAction = createSafeAction(async (args: z.infer<typeof deleteResourceSchema>, session) => {
  const parsed = deleteResourceSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error('Invalid resource id');
  }

  // Physical deletion is destructive. Admins may delete any resource without
  // purchase/entitlement/access history; editors may only clean up orphaned
  // drafts (e.g. a PDF upload that failed after the row was created).
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Forbidden: Admin access required.');
  }

  const { id } = parsed.data;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) {
    throw new Error('Resource not found');
  }

  if (session.role === Role.EDITOR && resource.documentId) {
    throw new Error('Forbidden: Only admins can delete resources with a document.');
  }

  // 1. Check dependencies to prevent destructive loss of history.
  const dependencies = await prisma.$transaction([
    prisma.purchase.count({ where: { resourceId: id } }),
    prisma.entitlement.count({ where: { resourceId: id } }),
    prisma.accessLog.count({ where: { resourceId: id } }),
  ]);

  const [purchaseCount, entitlementCount, accessCount] = dependencies;

  if (purchaseCount > 0 || entitlementCount > 0 || accessCount > 0) {
    throw new Error('This resource has existing purchases, entitlements, or access logs and cannot be physically deleted. Please Archive it instead.');
  }

  // Safe to delete if we reached here (e.g. genuinely disposable draft).
  // We can clean up ephemeral UploadIntents safely.
  await prisma.uploadIntent.deleteMany({ where: { resourceId: id } });

  // NOTE: We do not delete the document if it has access logs, but we already checked accessCount is 0!
  // However, a document could be shared? No, it's 1:1 with resource usually.
  // We will leave the Document orphaned for future async GC, ensuring total safety.

  try {
    await prisma.$transaction(async (tx) => {
      await tx.resource.delete({
        where: { id }
      });

      if (resource && session.userId) {
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: 'DELETE',
            entityType: 'RESOURCE',
            entityId: resource.id,
            details: { title: resource.title, type: resource.type }
          }
        });
      }
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('This resource is still referenced by related records and cannot be deleted. Please archive it instead.');
    }
    if (isRecordNotFoundError(error)) {
      throw new Error('Resource not found');
    }
    throw error;
  }

  return { success: true };
});

const updateResourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().max(5000).optional(),
  content: z.string().max(200_000).optional(),
  subjectId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  isPremium: z.boolean(),
  priceAmount: z.number().int().nonnegative().optional(),
  type: z.nativeEnum(ResourceType),
  unitId: z.string().uuid().optional(),
  status: z.nativeEnum(ContentStatus),
}).refine(data => {
  if (data.type === ResourceType.OLD_QUESTION) {
    return !!data.semesterId;
  }
  return !!data.subjectId;
}, {
  message: "Old Questions require a semester, other resources require a subject",
});

export const updateResourceAction = createSafeAction(async (args: z.infer<typeof updateResourceSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = updateResourceSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0]?.message || 'please check the form'}`);
  }

  const input = parsed.data;

  // NOTE: Ownership validation is NOT enforced for EDITING resources, as per business rules.
  // Any Editor can maintain/edit content to prevent orphaned data when staff leaves.

  const isPremium = input.isPremium;
  const priceAmount = isPremium ? (input.priceAmount ?? 0) : null;
  const currency = isPremium ? 'NPR' : undefined;

  await prisma.$transaction(async (tx) => {
    const resource = await tx.resource.update({
      where: { id: input.id },
      data: {
        title: input.title,
        content: input.content?.trim() || null,
        metaDesc: input.description?.trim() || null,
        subjectId: input.subjectId || null,
        semesterId: input.semesterId || null,
        isPremium,
        priceAmount,
        currency,
        type: input.type,
        unitId: input.unitId || null,
        status: input.status,
      }
    });

    if (session.userId) {
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'UPDATE',
          entityType: 'RESOURCE',
          entityId: resource.id,
          details: { title: resource.title, type: resource.type, status: resource.status }
        }
      });
    }
  });

  return { success: true };
});
