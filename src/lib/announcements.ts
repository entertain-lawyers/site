import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isMissingTableError } from '@/lib/prisma-errors';
import { ANNOUNCEMENT_CACHE_TAG } from '@/lib/cache-tags';

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  startDate: string | null;
  expiryDate: string | null;
  linkText: string | null;
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementStatus = 'active' | 'inactive' | 'scheduled' | 'expired';

export const INITIAL_ANNOUNCEMENT_TITLE = "We're Updating Our Website!";
export const INITIAL_ANNOUNCEMENT_MESSAGE =
  "Our website is currently undergoing updates and improvements. Some study materials and previously available content may be temporarily inaccessible.\n\nWe sincerely apologize for the inconvenience. The contents will be published again soon.\n\nThank you for your patience and continued support!\n\n— Team Entertain Lawyers";

export const DEFAULT_ANNOUNCEMENT: AnnouncementRecord = {
  id: 'initial-website-update',
  title: INITIAL_ANNOUNCEMENT_TITLE,
  message: INITIAL_ANNOUNCEMENT_MESSAGE,
  isActive: true,
  startDate: null,
  expiryDate: null,
  linkText: null,
  linkUrl: null,
  createdAt: '2026-11-18T00:00:00.000Z',
  updatedAt: '2026-11-18T00:00:00.000Z',
};

/**
 * Pure helper to compute lifecycle status for an announcement.
 */
export function getAnnouncementStatus(
  announcement: Pick<AnnouncementRecord, 'isActive' | 'startDate' | 'expiryDate'>,
  now: Date = new Date()
): AnnouncementStatus {
  if (!announcement.isActive) {
    return 'inactive';
  }

  const currentMs = now.getTime();

  if (announcement.startDate) {
    const startMs = new Date(announcement.startDate).getTime();
    if (!isNaN(startMs) && currentMs < startMs) {
      return 'scheduled';
    }
  }

  if (announcement.expiryDate) {
    const expiryMs = new Date(announcement.expiryDate).getTime();
    if (!isNaN(expiryMs) && currentMs > expiryMs) {
      return 'expired';
    }
  }

  return 'active';
}

/**
 * Checks whether an announcement is currently active and should be displayed to visitors.
 */
export function isAnnouncementActive(
  announcement: Pick<AnnouncementRecord, 'isActive' | 'startDate' | 'expiryDate' | 'title' | 'message'>,
  now: Date = new Date()
): boolean {
  if (!announcement.title?.trim() || !announcement.message?.trim()) {
    return false;
  }
  return getAnnouncementStatus(announcement, now) === 'active';
}

/**
 * Ensures all Date objects are serialized to ISO strings for safe Server-to-Client RSC passing.
 */
export function serializeAnnouncement(row: {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  startDate?: Date | string | null;
  expiryDate?: Date | string | null;
  linkText?: string | null;
  linkUrl?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): AnnouncementRecord {
  const toIso = (val: Date | string | null | undefined): string | null => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const nowIso = new Date().toISOString();

  return {
    id: row.id,
    title: row.title.trim(),
    message: row.message.trim(),
    isActive: Boolean(row.isActive),
    startDate: toIso(row.startDate),
    expiryDate: toIso(row.expiryDate),
    linkText: row.linkText?.trim() || null,
    linkUrl: row.linkUrl?.trim() || null,
    createdAt: toIso(row.createdAt) || nowIso,
    updatedAt: toIso(row.updatedAt) || nowIso,
  };
}

const fetchLatestAnnouncement = unstable_cache(
  async (): Promise<AnnouncementRecord | null> => {
    try {
      const row = await prisma.announcement.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (!row) {
        // No announcement row yet in database: provide initial fallback announcement
        return DEFAULT_ANNOUNCEMENT;
      }

      return serializeAnnouncement(row);
    } catch (error) {
      if (isMissingTableError(error)) {
        // Table hasn't been migrated yet (e.g. preview deployment or new clone)
        return DEFAULT_ANNOUNCEMENT;
      }
      console.warn('Could not load announcement from database; using default announcement.', error);
      return DEFAULT_ANNOUNCEMENT;
    }
  },
  ['global-active-announcement'],
  { revalidate: 3600, tags: [ANNOUNCEMENT_CACHE_TAG] }
);

/**
 * Returns the latest announcement record (active or inactive) for management or display.
 * Request-memoized via React cache().
 */
export const getLatestAnnouncement = cache(async (): Promise<AnnouncementRecord | null> => {
  return fetchLatestAnnouncement();
});

/**
 * Returns the currently active announcement to display on the homepage, or null if inactive/expired/scheduled.
 */
export const getActiveAnnouncement = cache(async (): Promise<AnnouncementRecord | null> => {
  const latest = await getLatestAnnouncement();
  if (!latest) return null;
  return isAnnouncementActive(latest) ? latest : null;
});
