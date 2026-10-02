'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const createSemesterSchema = z.object({
  name: z.string().min(1, 'Semester name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  order: z.number().int().default(0),
});

const updateSemesterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Semester name is required'),
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
    return { id: semester.id };
  } catch (error: any) {
    if (error?.code === 'P2002' || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
      throw new Error('A semester with this slug already exists. Please choose a different slug.');
    }
    throw error;
  }
});

export const updateSemesterAction = createSafeAction(async (args: z.infer<typeof updateSemesterSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

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
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002' || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
      throw new Error('A semester with this slug already exists. Please choose a different slug.');
    }
    throw error;
  }
});

export const deleteSemesterAction = createSafeAction(async (args: z.infer<typeof deleteSemesterSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

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
  } catch (error: any) {
    if (error?.code === 'P2003' || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')) {
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
  return { success: true };
});
