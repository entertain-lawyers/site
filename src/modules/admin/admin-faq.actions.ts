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

  // Keep new FAQs after existing ones. The form defaults `order` to 0, which
  // otherwise makes every row tie and breaks reordering.
  const last = await prisma.fAQ.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const order = args.order !== 0 ? args.order : (last?.order ?? -1) + 1;

  const faq = await prisma.fAQ.create({ data: { ...args, order } });

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

  // Normalize first, then swap by position. Comparing raw `order` values fails
  // when several rows tie at 0.
  const ordered = await prisma.fAQ.findMany({
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  const index = ordered.findIndex((faq) => faq.id === args.id);
  if (index === -1) throw new Error('FAQ not found');

  const swapIndex = args.direction === 'UP' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) return { success: true };

  const next = [...ordered];
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];

  await prisma.$transaction(
    next.map((faq, order) =>
      prisma.fAQ.update({ where: { id: faq.id }, data: { order } })
    )
  );

  revalidatePath('/admin/faqs');
  revalidatePath('/faqs');
  return { success: true };
});
