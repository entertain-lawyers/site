'use server';

import { createSafeAction, parseOrThrow, UserFacingError } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ANNOUNCEMENT_CACHE_TAG } from '@/lib/cache-tags';
import { serializeAnnouncement, type AnnouncementRecord } from '@/lib/announcements';
import { isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE } from '@/lib/url-validation';
import { isMissingTableError } from '@/lib/prisma-errors';
import { auth } from '@/lib/auth';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

const optionalLink = (max = 1000) =>
  optionalText(max).refine(
    (value) => !value || isSafeAssetUrl(value),
    SAFE_ASSET_URL_MESSAGE
  );

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((val) => {
    if (!val) return true;
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, 'Please enter a valid date and time');

const announcementSchema = z
  .object({
    id: z.string().optional().or(z.literal('')),
    mode: z.enum(['create', 'update']).optional(),
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title cannot exceed 150 characters'),
    message: z.string().trim().min(1, 'Message is required').max(3000, 'Message cannot exceed 3000 characters'),
    isActive: z.boolean().default(true),
    startDate: optionalDateTime,
    expiryDate: optionalDateTime,
    linkText: optionalText(80),
    linkUrl: optionalLink(500),
  })
  .refine(
    (data) => {
      if (data.startDate && data.expiryDate) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.expiryDate).getTime();
        return end > start;
      }
      return true;
    },
    {
      message: 'Expiry date must be after start date',
      path: ['expiryDate'],
    }
  );

const toggleAnnouncementSchema = z.object({
  id: z.string().min(1, 'Announcement ID is required'),
  isActive: z.boolean(),
});

function requireAdmin(role?: Role) {
  if (role !== Role.ADMIN) {
    throw new UserFacingError('Unauthorized: Only administrators can manage announcements.');
  }
}

function parseDateOrNull(val: string | undefined): Date | null {
  if (!val || !val.trim()) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

function toNull(val: string | undefined): string | null {
  if (!val || !val.trim()) return null;
  return val.trim();
}

/**
 * Creates or updates the active announcement.
 */
export const saveAnnouncementAction = createSafeAction(
  async (args: z.infer<typeof announcementSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(announcementSchema, args);

    const data = {
      title: input.title.trim(),
      message: input.message.trim(),
      isActive: input.isActive,
      startDate: parseDateOrNull(input.startDate),
      expiryDate: parseDateOrNull(input.expiryDate),
      linkText: toNull(input.linkText),
      linkUrl: toNull(input.linkUrl),
    };

    let targetAnnouncement: {
      id: string;
      title: string;
      message: string;
      isActive: boolean;
      startDate: Date | null;
      expiryDate: Date | null;
      linkText: string | null;
      linkUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

    let isCreate = false;
    const shouldCreate =
      input.mode === 'create' || !input.id || input.id === 'initial-website-update';

    if (!shouldCreate && input.id) {
      // Target existing announcement by ID
      const existing = await prisma.announcement.findUnique({
        where: { id: input.id },
      });

      if (existing) {
        targetAnnouncement = await prisma.announcement.update({
          where: { id: input.id },
          data,
        });
      } else {
        targetAnnouncement = await prisma.announcement.create({
          data,
        });
        isCreate = true;
      }
    } else {
      // Create a new announcement record to preserve history
      targetAnnouncement = await prisma.announcement.create({
        data,
      });
      isCreate = true;
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: isCreate ? 'CREATE' : 'UPDATE',
        entityType: 'Announcement',
        entityId: targetAnnouncement.id,
        details: {
          title: targetAnnouncement.title,
          isActive: targetAnnouncement.isActive,
          startDate: targetAnnouncement.startDate?.toISOString() ?? null,
          expiryDate: targetAnnouncement.expiryDate?.toISOString() ?? null,
        },
      },
    });

    // Invalidate caches so public visitors immediately see changes without a deployment
    revalidateTag(ANNOUNCEMENT_CACHE_TAG, { expire: 0 });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/announcements');
    revalidatePath('/admin');

    return serializeAnnouncement(targetAnnouncement);
  },
  { requireAdmin: true }
);

/**
 * Toggles an announcement's active state quickly.
 */
export const toggleAnnouncementActiveAction = createSafeAction(
  async (args: z.infer<typeof toggleAnnouncementSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(toggleAnnouncementSchema, args);

    const announcement = await prisma.announcement.update({
      where: { id: input.id },
      data: { isActive: input.isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'UPDATE',
        entityType: 'Announcement',
        entityId: announcement.id,
        details: {
          action: 'TOGGLE_ACTIVE',
          isActive: announcement.isActive,
        },
      },
    });

    revalidateTag(ANNOUNCEMENT_CACHE_TAG, { expire: 0 });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/announcements');
    revalidatePath('/admin');

    return {
      id: announcement.id,
      isActive: announcement.isActive,
    };
  },
  { requireAdmin: true }
);

/**
 * Fetches recent announcements for the admin view.
 * Protected with server-side administrator authorization.
 */
export async function getAnnouncementHistory(): Promise<AnnouncementRecord[]> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    throw new UserFacingError('Unauthorized: Only administrators can view announcement history.');
  }

  try {
    const list = await prisma.announcement.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return list.map(serializeAnnouncement);
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    console.warn('Could not load announcement history from database', error);
    return [];
  }
}
