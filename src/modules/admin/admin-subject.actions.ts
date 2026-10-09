'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordInUseError, isUniqueConstraintError } from '@/lib/prisma-errors';

const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  order: z.number().int().default(0),
  semesterId: z.string().uuid('Please select a valid semester'),
});

const updateSubjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Subject name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  order: z.number().int().default(0),
  semesterId: z.string().uuid('Please select a valid semester'),
});

const deleteSubjectSchema = z.object({
  id: z.string().uuid(),
});

export const createSubjectAction = createSafeAction(async (args: z.infer<typeof createSubjectSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const slug = args.slug && args.slug.trim() !== '' ? args.slug.trim().toLowerCase() : null;

  try {
    const subject = await prisma.subject.create({
      data: {
        name: args.name.trim(),
        slug,
        order: args.order ?? 0,
        semesterId: args.semesterId,
      },
    });

    if (session.userId) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'CREATE',
          entityType: 'SUBJECT',
          entityId: subject.id,
          details: { name: subject.name, slug: subject.slug, semesterId: subject.semesterId, order: subject.order },
        },
      });
    }

    revalidatePath('/admin/study/subjects');
    revalidatePath('/admin/study/semesters');
    revalidatePath('/study');
    return { id: subject.id };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error('A subject with this slug already exists. Please choose a different slug.');
    }
    throw error;
  }
});

export const updateSubjectAction = createSafeAction(async (args: z.infer<typeof updateSubjectSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const existing = await prisma.subject.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new Error('Subject not found');
  }

  const slug = args.slug && args.slug.trim() !== '' ? args.slug.trim().toLowerCase() : null;

  try {
    const updated = await prisma.subject.update({
      where: { id: args.id },
      data: {
        name: args.name.trim(),
        slug,
        order: args.order ?? 0,
        semesterId: args.semesterId,
      },
    });

    if (session.userId) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'UPDATE',
          entityType: 'SUBJECT',
          entityId: updated.id,
          details: { name: updated.name, slug: updated.slug, semesterId: updated.semesterId, order: updated.order },
        },
      });
    }

    revalidatePath('/admin/study/subjects');
    revalidatePath('/admin/study/semesters');
    revalidatePath('/study');
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error('A subject with this slug already exists. Please choose a different slug.');
    }
    throw error;
  }
});

export const deleteSubjectAction = createSafeAction(async (args: z.infer<typeof deleteSubjectSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const existing = await prisma.subject.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new Error('Subject not found');
  }

  try {
    await prisma.subject.delete({
      where: { id: args.id },
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('Cannot delete this subject because it contains units or study resources. Please delete or reassign them first.');
    }
    throw error;
  }

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entityType: 'SUBJECT',
        entityId: existing.id,
        details: { name: existing.name },
      },
    });
  }

  revalidatePath('/admin/study/subjects');
  revalidatePath('/admin/study/semesters');
  revalidatePath('/study');
  return { success: true };
});
