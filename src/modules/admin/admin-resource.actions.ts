'use server';

import { createSafeAction, UserFacingError } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ContentStatus, Role, ResourceType } from '@prisma/client';
import { isRecordInUseError, isRecordNotFoundError, isSpecificMissingColumnError } from '@/lib/prisma-errors';
import { deleteObject } from '@/lib/b2';
import { revalidatePath } from 'next/cache';
import { resolveLocalAuthor } from '@/lib/content-authors';

const createResourceSchema = z.object({
  title: z.string().min(3),
  description: z.string().max(5000).optional(),
  content: z.string().max(200_000).optional(),
  subjectId: z.string().min(1).optional(),
  semesterId: z.string().min(1).optional(),
  isPremium: z.boolean(),
  priceAmount: z.number().int().nonnegative().optional(),
  type: z.nativeEnum(ResourceType).optional(),
  unitId: z.string().min(1).optional(),
  // Local user credited as the author; defaults to the signed-in creator.
  authorUserId: z.string().min(1).optional(),
  // Drafts are hidden from students until published from the resources list.
  status: z.enum([ContentStatus.DRAFT, ContentStatus.PUBLISHED]).default(ContentStatus.PUBLISHED),
}).refine(data => {
  if (data.type === ResourceType.OLD_QUESTION) {
    return !!data.semesterId;
  }
  return !!data.subjectId;
}, {
  message: "Old Questions require a semester, other resources require a subject",
});

export const createResourceAction = createSafeAction(async (args: z.input<typeof createResourceSchema>, session) => {
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
    throw new UserFacingError('Only admins can create law notes and case laws');
  }
  // Honour the admin's Premium checkbox instead of deriving it from the type;
  // "Write Note" resources can be free or paid.
  const isPremium = input.isPremium;
  const priceAmount = isPremium ? (input.priceAmount ?? 0) : null;
  const currency = isPremium ? 'NPR' : undefined;

  // Attribution is validated server-side; a forged request cannot credit a
  // non-author. The creator is stored separately and is always the actor.
  const isExplicitAuthorSelection = Boolean(input.authorUserId);
  const authorId = input.authorUserId ?? session.userId;
  if (!authorId) {
    throw new UserFacingError('An author is required to create a resource.');
  }
  await resolveLocalAuthor(authorId);

  const resourceId = await prisma.$transaction(async (tx) => {
    let resource;
    try {
      resource = await tx.resource.create({
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
          status: input.status,
          authorId,
          createdById: session.userId ?? null,
        }
      });
    } catch (createError) {
      if (!isSpecificMissingColumnError(createError, ['authorId', 'createdById'])) {
        console.error('[admin-resource] create resource database error:', createError);
        throw createError;
      }

      // If the administrator explicitly selected an author, never silently discard it!
      if (isExplicitAuthorSelection) {
        throw new UserFacingError(
          'Author assignment failed because database migration 20261101000000 has not been applied yet. Run database migrations before assigning an author, or leave author unassigned.'
        );
      }

      console.warn('[admin-resource] create with authorId/createdById failed (migration pending), retrying base fields:', createError);
      resource = await tx.resource.create({
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
          status: input.status,
        }
      });
    }

    if (session.userId) {
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'CREATE',
          entityType: 'RESOURCE',
          entityId: resource.id,
          details: { title: resource.title, type: resource.type, status: resource.status, authorUserId: authorId }
        }
      });
    }

    return resource.id;
  });

  revalidatePath('/admin/study/resources');
  return { resourceId };
});

const deleteResourceSchema = z.object({
  id: z.string().uuid(),
});

/** Only keys this app generates for resource PDFs may be removed from storage. */
const DOCUMENT_KEY_PREFIX = 'documents/';

export type DeleteResourceResult = {
  success: true;
  /** Stored PDFs removed after the database delete committed. */
  filesRemoved: number;
  /** Stored PDFs that could not be removed (database is already consistent). */
  filesFailed: number;
};

export const deleteResourceAction = createSafeAction(async (args: z.infer<typeof deleteResourceSchema>, session): Promise<DeleteResourceResult> => {
  const parsed = deleteResourceSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error('Invalid resource id');
  }

  // Physical deletion is destructive. Admins may delete any resource without
  // purchase or entitlement history; editors may only clean up orphaned
  // drafts (e.g. a PDF upload that failed after the row was created).
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Forbidden: Admin access required.');
  }

  const { id } = parsed.data;
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      document: { select: { id: true, storageKey: true, Publication: { select: { id: true } } } },
      uploadIntents: { select: { storageKey: true } },
    },
  });
  if (!resource) {
    throw new Error('Resource not found');
  }

  if (session.role === Role.EDITOR && resource.documentId) {
    throw new Error('Forbidden: Only admins can delete resources with a document.');
  }

  // Purchases and entitlements are financial/access records that must keep
  // pointing at the resource, so those resources are archived, not deleted.
  // Access logs used to block deletion too, but opening a PDF (including the
  // admin's own "View") writes one, which made every viewed resource
  // undeletable. They are history only: the foreign key is ON DELETE SET
  // NULL, so the rows are kept and simply lose the link.
  const [purchaseCount, entitlementCount] = await prisma.$transaction([
    prisma.purchase.count({ where: { resourceId: id } }),
    prisma.entitlement.count({ where: { resourceId: id } }),
  ]);

  if (purchaseCount > 0 || entitlementCount > 0) {
    throw new UserFacingError('This resource has purchases or entitlements and cannot be deleted. Archive it instead to hide it from students.');
  }

  // The resource's own Document row goes with it, unless a publication also
  // points at it (Publication.documentId is RESTRICT).
  const ownDocument =
    resource.document && !resource.document.Publication ? resource.document : null;

  try {
    await prisma.$transaction(async (tx) => {
      // UploadIntent rows cascade with the resource.
      await tx.resource.delete({ where: { id } });

      if (ownDocument) {
        await tx.document.delete({ where: { id: ownDocument.id } });
      }

      if (session.userId) {
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: 'DELETE',
            entityType: 'RESOURCE',
            entityId: resource.id,
            details: { title: resource.title, type: resource.type, documentDeleted: Boolean(ownDocument) },
          },
        });
      }
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new UserFacingError('This resource is still referenced by related records and cannot be deleted. Archive it instead.');
    }
    if (isRecordNotFoundError(error)) {
      throw new Error('Resource not found');
    }
    throw error;
  }

  // Storage is cleaned up only after the database commit, so a storage outage
  // can never leave a resource row pointing at a missing file. A key is
  // removed only if it is one of ours and no remaining Document uses it.
  const candidateKeys = new Set(
    [ownDocument?.storageKey, ...resource.uploadIntents.map((intent) => intent.storageKey)].filter(
      (key): key is string => typeof key === 'string' && key.startsWith(DOCUMENT_KEY_PREFIX)
    )
  );

  let filesRemoved = 0;
  let filesFailed = 0;
  for (const key of candidateKeys) {
    const stillReferenced = await prisma.document.count({ where: { storageKey: key } });
    if (stillReferenced > 0) continue;
    try {
      await deleteObject(key);
      filesRemoved++;
    } catch (error) {
      filesFailed++;
      console.error(`[resources] Deleted resource ${id} but could not remove stored file ${key}:`, error);
    }
  }

  revalidatePath('/admin/study/resources');
  revalidatePath('/resources');
  revalidatePath('/study');

  return { success: true, filesRemoved, filesFailed };
});

const archiveResourceSchema = z.object({
  id: z.string().uuid(),
  archived: z.boolean(),
});

/**
 * Hides a resource from students without deleting it — the path for
 * resources whose purchases or entitlements must be preserved.
 */
export const setResourceArchivedAction = createSafeAction(async (args: z.infer<typeof archiveResourceSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }
  const parsed = archiveResourceSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error('Invalid resource id');
  }
  const { id, archived } = parsed.data;

  let resource;
  try {
    resource = await prisma.resource.update({
      where: { id },
      data: { status: archived ? ContentStatus.ARCHIVED : ContentStatus.PUBLISHED },
      select: { id: true, title: true, status: true },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) throw new Error('Resource not found');
    throw error;
  }

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'RESOURCE',
        entityId: resource.id,
        details: { title: resource.title, change: resource.status },
      },
    });
  }

  revalidatePath('/admin/study/resources');
  revalidatePath('/resources');
  revalidatePath('/study');
  return { status: resource.status };
});

const publishResourceSchema = z.object({
  id: z.string().uuid(),
  published: z.boolean(),
});

/**
 * Publish a draft, or move a published resource back to draft while it is
 * being prepared. Archived resources are restored with the Archive button.
 */
export const setResourcePublishedAction = createSafeAction(async (args: z.infer<typeof publishResourceSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }
  const parsed = publishResourceSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error('Invalid resource id');
  }
  const { id, published } = parsed.data;

  const existing = await prisma.resource.findUnique({ where: { id }, select: { status: true, type: true } });
  if (!existing) throw new Error('Resource not found');
  if (existing.status === ContentStatus.ARCHIVED) {
    throw new UserFacingError('This resource is archived. Restore it before changing its draft status.');
  }
  if (
    session.role === Role.EDITOR &&
    (existing.type === ResourceType.LAW_NOTE || existing.type === ResourceType.CASE_LAW)
  ) {
    throw new UserFacingError('Only admins can publish or unpublish law notes and case laws');
  }

  const resource = await prisma.resource.update({
    where: { id },
    data: { status: published ? ContentStatus.PUBLISHED : ContentStatus.DRAFT },
    select: { id: true, title: true, status: true },
  });

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'RESOURCE',
        entityId: resource.id,
        details: { title: resource.title, change: resource.status },
      },
    });
  }

  revalidatePath('/admin/study/resources');
  revalidatePath('/resources');
  revalidatePath('/study');
  return { status: resource.status };
});

const updateResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  description: z.string().max(5000).optional(),
  content: z.string().max(200_000).optional(),
  subjectId: z.string().min(1).optional(),
  semesterId: z.string().min(1).optional(),
  isPremium: z.boolean(),
  priceAmount: z.number().int().nonnegative().optional(),
  type: z.nativeEnum(ResourceType),
  unitId: z.string().min(1).optional(),
  status: z.nativeEnum(ContentStatus),
  // Omitted leaves the current author unchanged (older callers, bulk edits).
  authorUserId: z.string().min(1).optional(),
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

  // Validated before the transaction so a forged/ineligible author changes nothing.
  if (input.authorUserId) {
    await resolveLocalAuthor(input.authorUserId);
  }

  await prisma.$transaction(async (tx) => {
    let resource;
    try {
      resource = await tx.resource.update({
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
          ...(input.authorUserId ? { authorId: input.authorUserId } : {}),
        }
      });
    } catch (updateError) {
      if (!isSpecificMissingColumnError(updateError, ['authorId', 'createdById'])) {
        console.error('[admin-resource] update resource database error:', updateError);
        throw updateError;
      }

      // If the administrator explicitly selected an author, never silently discard it!
      if (input.authorUserId) {
        throw new UserFacingError(
          'Author assignment failed because database migration 20261101000000 has not been applied yet. Run database migrations before assigning an author.'
        );
      }

      console.warn('[admin-resource] update with authorId failed (migration pending), retrying base fields:', updateError);
      resource = await tx.resource.update({
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
    }

    if (session.userId) {
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'UPDATE',
          entityType: 'RESOURCE',
          entityId: resource.id,
          details: {
            title: resource.title,
            type: resource.type,
            status: resource.status,
            ...(input.authorUserId ? { authorUserId: input.authorUserId } : {}),
          }
        }
      });
    }
  });

  return { success: true };
});
