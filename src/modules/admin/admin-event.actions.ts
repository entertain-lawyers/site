'use server';

import { createSafeAction, UserFacingError } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordInUseError, isRecordNotFoundError, isUniqueConstraintError } from '@/lib/prisma-errors';
import { isSafeAssetUrl, isValidDateString, SAFE_ASSET_URL_MESSAGE } from '@/lib/url-validation';

const createEventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  content: z.string().optional(),
  eventDate: z.string().refine(isValidDateString, 'Event date is invalid'),
  location: z.string().optional(),
  featuredImage: z.string().refine(isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

const updateEventSchema = createEventSchema.extend({
  id: z.string().uuid(),
});

const deleteEventSchema = z.object({
  id: z.string().uuid(),
});

export const createEventAction = createSafeAction(async (args: z.infer<typeof createEventSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = createEventSchema.safeParse(args);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid event');
  const input = parsed.data;

  let evt;
  try {
    evt = await prisma.event.create({
      data: {
        ...input,
        eventDate: new Date(input.eventDate),
        authorId: session.userId!,
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('An event with this slug already exists. Choose a different slug.');
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'CREATE', entityType: 'EVENT', entityId: evt.id, details: { title: evt.title } }
  });

  revalidatePath('/admin/events');
  revalidatePath('/events');
  return { id: evt.id };
});

export const updateEventAction = createSafeAction(async (args: z.infer<typeof updateEventSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = updateEventSchema.safeParse(args);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid event');
  const input = parsed.data;

  const existing = await prisma.event.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error('Event not found');

  let evt;
  try {
    evt = await prisma.event.update({
      where: { id: input.id },
      data: { ...input, eventDate: new Date(input.eventDate) },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('An event with this slug already exists. Choose a different slug.');
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'UPDATE', entityType: 'EVENT', entityId: evt.id, details: { title: evt.title } }
  });

  revalidatePath('/admin/events');
  revalidatePath('/events');
  return { success: true };
});

export const deleteEventAction = createSafeAction(async (args: z.infer<typeof deleteEventSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');

  const parsed = deleteEventSchema.safeParse(args);
  if (!parsed.success) throw new Error('Invalid event id');
  const { id } = parsed.data;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error('Event not found');

  try {
    await prisma.event.delete({ where: { id } });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new UserFacingError('This event is still referenced by related records and cannot be deleted. Please archive it instead.');
    }
    if (isRecordNotFoundError(error)) {
      throw new Error('Event not found');
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: { userId: session.userId!, action: 'DELETE', entityType: 'EVENT', entityId: existing.id, details: { title: existing.title } }
  });

  revalidatePath('/admin/events');
  revalidatePath('/events');
  return { success: true };
});
