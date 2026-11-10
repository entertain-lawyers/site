'use server';

import { createSafeAction, UserFacingError } from '@/lib/safe-action';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ContentStatus, Role } from '@prisma/client';
import { slugify, slugifyWithFallback, withUniqueSlug } from '@/lib/slug';
import { ACT_CATEGORIES, ActCategoryValue } from '@/modules/acts/act.constants';

const categoryValues = ACT_CATEGORIES.map((c) => c.value) as [ActCategoryValue, ...ActCategoryValue[]];

const actBaseSchema = {
  title: z.string().min(2, 'Title is required (min 2 characters)'),
  titleEn: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  category: z.enum(categoryValues),
  description: z.string().max(5000).optional().nullable(),
  documentUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  publishDate: z.string().optional().nullable(),
  status: z.nativeEnum(ContentStatus).default(ContentStatus.PUBLISHED),
};

const createActSchema = z.object(actBaseSchema);

const updateActSchema = z.object({
  id: z.string().uuid(),
  ...actBaseSchema,
});

const slugIsTaken = (excludeId?: string) => async (slug: string) => {
  const existing = await prisma.actLaw.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return Boolean(existing);
};

export const createActAction = createSafeAction(async (args: z.input<typeof createActSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = createActSchema.safeParse(args);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message || 'Invalid parameters');
  }

  const input = parsed.data;
  const baseSlug = slugify(input.slug ?? '') || slugifyWithFallback(input.title, 'act');

  const act = await withUniqueSlug(baseSlug, slugIsTaken(), (slug) =>
    prisma.actLaw.create({
      data: {
        title: input.title.trim(),
        titleEn: input.titleEn?.trim() || null,
        slug,
        category: input.category,
        description: input.description?.trim() || null,
        documentUrl: input.documentUrl?.trim() || null,
        fileSize: input.fileSize || null,
        publishDate: input.publishDate ? new Date(input.publishDate) : null,
        status: input.status,
      },
    })
  );

  return act;
});

export const updateActAction = createSafeAction(async (args: z.input<typeof updateActSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = updateActSchema.safeParse(args);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message || 'Invalid parameters');
  }

  const input = parsed.data;
  const existing = await prisma.actLaw.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new UserFacingError('Act or law not found');
  }

  const currentSlug = existing.slug && slugify(existing.slug) === existing.slug ? existing.slug : '';
  const requestedSlug =
    slugify(input.slug ?? '') || currentSlug || slugifyWithFallback(input.title, 'act');

  const act = await withUniqueSlug(
    requestedSlug,
    requestedSlug === existing.slug ? async () => false : slugIsTaken(input.id),
    (slug) =>
      prisma.actLaw.update({
        where: { id: input.id },
        data: {
          title: input.title.trim(),
          titleEn: input.titleEn?.trim() || null,
          slug,
          category: input.category,
          description: input.description?.trim() || null,
          documentUrl: input.documentUrl?.trim() || null,
          fileSize: input.fileSize || null,
          publishDate: input.publishDate ? new Date(input.publishDate) : null,
          status: input.status,
        },
      })
  );

  return act;
});

export const deleteActAction = createSafeAction(async ({ id }: { id: string }, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.actLaw.findUnique({ where: { id } });
  if (!existing) {
    throw new UserFacingError('Act or law not found');
  }

  await prisma.actLaw.delete({ where: { id } });
  return { id };
});
