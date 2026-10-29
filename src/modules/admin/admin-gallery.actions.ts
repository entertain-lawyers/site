'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordInUseError, isRecordNotFoundError } from '@/lib/prisma-errors';

const createGallerySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

const updateGallerySchema = createGallerySchema.extend({
  id: z.string().uuid(),
});

const deleteGallerySchema = z.object({
  id: z.string().uuid(),
});

export const createGalleryAction = createSafeAction(async (args: z.infer<typeof createGallerySchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const gallery = await prisma.gallery.create({ data: args });

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'CREATE', entityType: 'GALLERY', entityId: gallery.id, details: { title: gallery.title } }
  });

  revalidatePath('/admin/gallery');
  revalidatePath('/gallery');
  return { id: gallery.id };
});

export const updateGalleryAction = createSafeAction(async (args: z.infer<typeof updateGallerySchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const existing = await prisma.gallery.findUnique({ where: { id: args.id } });
  if (!existing) throw new Error('Gallery not found');

  const gallery = await prisma.gallery.update({
    where: { id: args.id },
    data: args,
  });

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'UPDATE', entityType: 'GALLERY', entityId: gallery.id, details: { title: gallery.title } }
  });

  revalidatePath('/admin/gallery');
  revalidatePath('/gallery');
  return { success: true };
});

export const deleteGalleryAction = createSafeAction(async (args: z.infer<typeof deleteGallerySchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const existing = await prisma.gallery.findUnique({ where: { id: args.id } });
  if (!existing) throw new Error('Gallery not found');

  try {
    await prisma.gallery.delete({ where: { id: args.id } }); // CASCADE deletes GalleryImage rows in DB, but orphaned B2 images remain!
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('This gallery is still referenced by related records and cannot be deleted. Please archive it instead.');
    }
    if (isRecordNotFoundError(error)) {
      throw new Error('Gallery not found');
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'DELETE', entityType: 'GALLERY', entityId: existing.id, details: { title: existing.title } }
  });

  revalidatePath('/admin/gallery');
  revalidatePath('/gallery');
  return { success: true };
});

const addGalleryImageSchema = z.object({
  galleryId: z.string().uuid(),
  // Storage returns relative paths (/uploads/... or /api/media/...), so a bare
  // z.string().url() rejects every image the admin uploads.
  url: z.string().min(1).max(2048).refine(
    (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
    'Image URL must be a path starting with / or an http(s) URL'
  ),
  altText: z.string().optional(),
  caption: z.string().optional(),
});

export const addGalleryImageAction = createSafeAction(async (args: z.infer<typeof addGalleryImageSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = addGalleryImageSchema.safeParse(args);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid gallery image');
  const input = parsed.data;

  // get max order
  const lastImage = await prisma.galleryImage.findFirst({
    where: { galleryId: input.galleryId },
    orderBy: { order: 'desc' },
  });
  const newOrder = lastImage ? lastImage.order + 1 : 0;

  await prisma.galleryImage.create({
    data: { ...input, order: newOrder }
  });

  revalidatePath(`/admin/gallery/${input.galleryId}/edit`);
  revalidatePath('/gallery');
  return { success: true };
});

const reorderGalleryImageSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(['UP', 'DOWN']),
});

export const reorderGalleryImageAction = createSafeAction(async (args: z.infer<typeof reorderGalleryImageSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const img = await prisma.galleryImage.findUnique({ where: { id: args.id } });
  if (!img) throw new Error('Image not found');

  const targetImg = await prisma.galleryImage.findFirst({
    where: {
      galleryId: img.galleryId,
      order: args.direction === 'UP' ? { lt: img.order } : { gt: img.order },
    },
    orderBy: { order: args.direction === 'UP' ? 'desc' : 'asc' },
  });

  if (!targetImg) return { success: true }; // Nothing to swap with

  await prisma.$transaction([
    prisma.galleryImage.update({ where: { id: img.id }, data: { order: targetImg.order } }),
    prisma.galleryImage.update({ where: { id: targetImg.id }, data: { order: img.order } }),
  ]);

  revalidatePath(`/admin/gallery/${img.galleryId}/edit`);
  revalidatePath('/gallery');
  return { success: true };
});

const deleteGalleryImageSchema = z.object({ id: z.string().uuid() });
export const deleteGalleryImageAction = createSafeAction(async (args: z.infer<typeof deleteGalleryImageSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const img = await prisma.galleryImage.findUnique({ where: { id: args.id } });
  if (!img) throw new Error('Image not found');

  try {
    await prisma.galleryImage.delete({ where: { id: args.id } });
  } catch (error) {
    if (isRecordNotFoundError(error)) throw new Error('Image not found');
    throw error;
  }

  revalidatePath(`/admin/gallery/${img.galleryId}/edit`);
  revalidatePath('/gallery');
  return { success: true };
});
