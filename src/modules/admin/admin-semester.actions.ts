'use server';

import { createSafeAction, parseOrThrow } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { SEMESTERS_CACHE_TAG } from '@/lib/cache-tags';
import { isRecordInUseError, isUniqueConstraintError } from '@/lib/prisma-errors';

const createSemesterSchema = z.object({
  name: z.string().trim().min(1, 'Semester name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  order: z.number().int().default(0),
});

const updateSemesterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Semester name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  order: z.number().int().default(0),
});

const deleteSemesterSchema = z.object({
  id: z.string().uuid(),
});

export const createSemesterAction = createSafeAction(async (args: z.infer<typeof createSemesterSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  args = parseOrThrow(createSemesterSchema, args);

  const slug = args.slug && args.slug.trim() !== '' ? args.slug.trim().toLowerCase() : null;

  try {
    const semester = await prisma.semester.create({
      data: {
        name: args.name.trim(),
        slug,
        order: args.order ?? 0,
      },
    });

    if (session.userId) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'CREATE',
          entityType: 'SEMESTER',
          entityId: semester.id,
          details: { name: semester.name, slug: semester.slug, order: semester.order },
        },
      });
    }

    revalidatePath('/admin/study/semesters');
    revalidatePath('/study');
    revalidatePath('/semesters');
    revalidateTag(SEMESTERS_CACHE_TAG, { expire: 0 });
    return { id: semester.id };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error('A semester with this slug already exists. Please choose a different slug.');
    }
    throw error;
  }
});

export const updateSemesterAction = createSafeAction(async (args: z.infer<typeof updateSemesterSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  args = parseOrThrow(updateSemesterSchema, args);

  const existing = await prisma.semester.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new Error('Semester not found');
  }

  const slug = args.slug && args.slug.trim() !== '' ? args.slug.trim().toLowerCase() : null;

  try {
    const updated = await prisma.semester.update({
      where: { id: args.id },
      data: {
        name: args.name.trim(),
        slug,
        order: args.order ?? 0,
      },
    });

    if (session.userId) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'UPDATE',
          entityType: 'SEMESTER',
          entityId: updated.id,
          details: { name: updated.name, slug: updated.slug, order: updated.order },
        },
      });
    }

    revalidatePath('/admin/study/semesters');
    revalidatePath('/study');
    revalidatePath('/semesters');
    revalidateTag(SEMESTERS_CACHE_TAG, { expire: 0 });
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error('A semester with this slug already exists. Please choose a different slug.');
    }
    throw error;
  }
});

export const deleteSemesterAction = createSafeAction(async (args: z.infer<typeof deleteSemesterSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  args = parseOrThrow(deleteSemesterSchema, args);

  const existing = await prisma.semester.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new Error('Semester not found');
  }

  try {
    await prisma.semester.delete({
      where: { id: args.id },
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('Cannot delete this semester because it contains subjects. Please delete or reassign them first.');
    }
    throw error;
  }

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entityType: 'SEMESTER',
        entityId: existing.id,
        details: { name: existing.name },
      },
    });
  }

  revalidatePath('/admin/study/semesters');
  revalidatePath('/study');
  revalidatePath('/semesters');
  revalidateTag(SEMESTERS_CACHE_TAG, { expire: 0 });
  return { success: true };
});
