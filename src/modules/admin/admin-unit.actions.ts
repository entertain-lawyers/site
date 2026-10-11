'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordInUseError } from '@/lib/prisma-errors';

const createUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  title: z.string().optional().or(z.literal('')),
  order: z.number().int().default(0),
  subjectId: z.string().uuid('Please select a valid subject'),
});

const updateUnitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Unit name is required'),
  title: z.string().optional().or(z.literal('')),
  order: z.number().int().default(0),
  subjectId: z.string().uuid('Please select a valid subject'),
});

const deleteUnitSchema = z.object({
  id: z.string().uuid(),
});

export const createUnitAction = createSafeAction(async (args: z.infer<typeof createUnitSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const title = args.title && args.title.trim() !== '' ? args.title.trim() : null;

  const unit = await prisma.unit.create({
    data: {
      name: args.name.trim(),
      title,
      order: args.order ?? 0,
      subjectId: args.subjectId,
    },
  });

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entityType: 'UNIT',
        entityId: unit.id,
        details: { name: unit.name, title: unit.title, subjectId: unit.subjectId, order: unit.order },
      },
    });
  }

  revalidatePath('/admin/study/units');
  revalidatePath('/admin/study/subjects');
  revalidatePath('/study');
  return { id: unit.id };
});

export const updateUnitAction = createSafeAction(async (args: z.infer<typeof updateUnitSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const existing = await prisma.unit.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new Error('Unit not found');
  }

  const title = args.title && args.title.trim() !== '' ? args.title.trim() : null;

  const updated = await prisma.unit.update({
    where: { id: args.id },
    data: {
      name: args.name.trim(),
      title,
      order: args.order ?? 0,
      subjectId: args.subjectId,
    },
  });

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'UNIT',
        entityId: updated.id,
        details: { name: updated.name, title: updated.title, subjectId: updated.subjectId, order: updated.order },
      },
    });
  }

  revalidatePath('/admin/study/units');
  revalidatePath('/admin/study/subjects');
  revalidatePath('/study');
  return { success: true };
});

export const deleteUnitAction = createSafeAction(async (args: z.infer<typeof deleteUnitSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const existing = await prisma.unit.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new Error('Unit not found');
  }

  try {
    await prisma.unit.delete({
      where: { id: args.id },
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('Cannot delete this unit because it contains study resources. Please delete or reassign them first.');
    }
    throw error;
  }

  if (session.userId) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entityType: 'UNIT',
        entityId: existing.id,
        details: { name: existing.name },
      },
    });
  }

  revalidatePath('/admin/study/units');
  revalidatePath('/admin/study/subjects');
  revalidatePath('/study');
  return { success: true };
});
