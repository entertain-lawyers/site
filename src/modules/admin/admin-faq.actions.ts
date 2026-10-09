'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordNotFoundError } from '@/lib/prisma-errors';

const createFAQSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  order: z.number().int().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});

const updateFAQSchema = createFAQSchema.extend({
  id: z.string().uuid(),
});

const deleteFAQSchema = z.object({
  id: z.string().uuid(),
});

export const createFAQAction = createSafeAction(async (args: z.infer<typeof createFAQSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const faq = await prisma.fAQ.create({ data: args });

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'CREATE', entityType: 'FAQ', entityId: faq.id, details: { question: faq.question } }
  });

  revalidatePath('/admin/faqs');
  revalidatePath('/faqs');
  return { id: faq.id };
});

export const updateFAQAction = createSafeAction(async (args: z.infer<typeof updateFAQSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const existing = await prisma.fAQ.findUnique({ where: { id: args.id } });
  if (!existing) throw new Error('FAQ not found');

  const faq = await prisma.fAQ.update({
    where: { id: args.id },
    data: args,
  });

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'UPDATE', entityType: 'FAQ', entityId: faq.id, details: { question: faq.question } }
  });

  revalidatePath('/admin/faqs');
  revalidatePath('/faqs');
  return { success: true };
});

export const deleteFAQAction = createSafeAction(async (args: z.infer<typeof deleteFAQSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const existing = await prisma.fAQ.findUnique({ where: { id: args.id } });
  if (!existing) throw new Error('FAQ not found');

  try {
    await prisma.fAQ.delete({ where: { id: args.id } });
  } catch (error) {
    if (isRecordNotFoundError(error)) throw new Error('FAQ not found');
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'DELETE', entityType: 'FAQ', entityId: existing.id, details: { question: existing.question } }
  });

  revalidatePath('/admin/faqs');
  revalidatePath('/faqs');
  return { success: true };
});

const reorderFAQSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(['UP', 'DOWN']),
});

export const reorderFAQAction = createSafeAction(async (args: z.infer<typeof reorderFAQSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const item = await prisma.fAQ.findUnique({ where: { id: args.id } });
  if (!item) throw new Error('FAQ not found');

  const targetItem = await prisma.fAQ.findFirst({
    where: {
      order: args.direction === 'UP' ? { lt: item.order } : { gt: item.order },
    },
    orderBy: { order: args.direction === 'UP' ? 'desc' : 'asc' },
  });

  if (!targetItem) return { success: true }; // Nothing to swap with

  await prisma.$transaction([
    prisma.fAQ.update({ where: { id: item.id }, data: { order: targetItem.order } }),
    prisma.fAQ.update({ where: { id: targetItem.id }, data: { order: item.order } }),
  ]);

  revalidatePath('/admin/faqs');
  revalidatePath('/faqs');
  return { success: true };
});
