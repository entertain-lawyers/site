'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordInUseError, isRecordNotFoundError, isUniqueConstraintError } from '@/lib/prisma-errors';
import { isSafeAssetUrl, isValidDateString, SAFE_ASSET_URL_MESSAGE } from '@/lib/url-validation';

const createPublicationSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  content: z.string().optional(),
  publishDate: z.string().refine((v) => !v || isValidDateString(v), 'Publish date is invalid').optional(),
  coverImage: z.string().refine(isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE).optional(),
  documentUrl: z.string().refine(isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

const updatePublicationSchema = createPublicationSchema.extend({
  id: z.string().uuid(),
});

const deletePublicationSchema = z.object({
  id: z.string().uuid(),
});

export const createPublicationAction = createSafeAction(async (args: z.infer<typeof createPublicationSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = createPublicationSchema.safeParse(args);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid publication');
  const input = parsed.data;

  let pub;
  try {
    pub = await prisma.publication.create({
      data: {
        ...input,
        publishDate: input.publishDate ? new Date(input.publishDate) : null,
        authorId: session.userId!,
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('A publication with this slug already exists. Choose a different slug.');
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'CREATE', entityType: 'PUBLICATION', entityId: pub.id, details: { title: pub.title } }
  });

  revalidatePath('/admin/publications');
  revalidatePath('/publications');
  return { id: pub.id };
});

export const updatePublicationAction = createSafeAction(async (args: z.infer<typeof updatePublicationSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = updatePublicationSchema.safeParse(args);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid publication');
  const input = parsed.data;

  const existing = await prisma.publication.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error('Publication not found');

  let pub;
  try {
    pub = await prisma.publication.update({
      where: { id: input.id },
      data: { ...input, publishDate: input.publishDate ? new Date(input.publishDate) : null },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('A publication with this slug already exists. Choose a different slug.');
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'UPDATE', entityType: 'PUBLICATION', entityId: pub.id, details: { title: pub.title } }
  });

  revalidatePath('/admin/publications');
  revalidatePath('/publications');
  return { success: true };
});

export const deletePublicationAction = createSafeAction(async (args: z.infer<typeof deletePublicationSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = deletePublicationSchema.safeParse(args);
  if (!parsed.success) throw new Error('Invalid publication id');
  const { id } = parsed.data;

  const existing = await prisma.publication.findUnique({ where: { id } });
  if (!existing) throw new Error('Publication not found');

  // Publication might have a document attached. Schema says `document Document? @relation(onDelete: Restrict)`
  try {
    await prisma.publication.delete({ where: { id } });
  } catch (err) {
    if (isRecordInUseError(err)) {
      throw new Error('This publication has an attached secure document. You must detach or archive it first.');
    }
    if (isRecordNotFoundError(err)) throw new Error('Publication not found');
    throw err;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'DELETE', entityType: 'PUBLICATION', entityId: existing.id, details: { title: existing.title } }
  });

  revalidatePath('/admin/publications');
  revalidatePath('/publications');
  return { success: true };
});
