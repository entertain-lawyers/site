import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  isAnnouncementActive,
  getAnnouncementStatus,
  serializeAnnouncement,
  getActiveAnnouncement,
  getLatestAnnouncement,
  DEFAULT_ANNOUNCEMENT,
  INITIAL_ANNOUNCEMENT_TITLE,
  INITIAL_ANNOUNCEMENT_MESSAGE,
} from '../announcements';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    announcement: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

describe('Announcements helper functions', () => {
  const baseAnnouncement = {
    title: 'Important Update',
    message: 'We are working on improvements.',
    isActive: true,
    startDate: null,
    expiryDate: null,
  };

  const now = new Date('2026-11-18T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAnnouncementActive', () => {
    it('returns true when active with no dates', () => {
      expect(isAnnouncementActive(baseAnnouncement, now)).toBe(true);
    });

    it('returns false when isActive is false', () => {
      expect(isAnnouncementActive({ ...baseAnnouncement, isActive: false }, now)).toBe(false);
    });

    it('returns false when title or message is empty', () => {
      expect(isAnnouncementActive({ ...baseAnnouncement, title: '   ' }, now)).toBe(false);
      expect(isAnnouncementActive({ ...baseAnnouncement, message: '' }, now)).toBe(false);
    });

    it('handles future start date (not yet active)', () => {
      const futureStart = {
        ...baseAnnouncement,
        startDate: '2026-11-19T00:00:00Z',
      };
      expect(isAnnouncementActive(futureStart, now)).toBe(false);
    });

    it('handles past start date (already active)', () => {
      const pastStart = {
        ...baseAnnouncement,
        startDate: '2026-11-17T00:00:00Z',
      };
      expect(isAnnouncementActive(pastStart, now)).toBe(true);
    });

    it('handles past expiry date (expired)', () => {
      const expired = {
        ...baseAnnouncement,
        expiryDate: '2026-11-17T00:00:00Z',
      };
      expect(isAnnouncementActive(expired, now)).toBe(false);
    });

    it('handles future expiry date (still active)', () => {
      const futureExpiry = {
        ...baseAnnouncement,
        expiryDate: '2026-11-19T00:00:00Z',
      };
      expect(isAnnouncementActive(futureExpiry, now)).toBe(true);
    });

    it('handles active within both start and expiry window', () => {
      const withinWindow = {
        ...baseAnnouncement,
        startDate: '2026-11-17T00:00:00Z',
        expiryDate: '2026-11-19T00:00:00Z',
      };
      expect(isAnnouncementActive(withinWindow, now)).toBe(true);
    });

    it('handles expired within range where now is after expiry', () => {
      const afterWindow = {
        ...baseAnnouncement,
        startDate: '2026-11-10T00:00:00Z',
        expiryDate: '2026-11-15T00:00:00Z',
      };
      expect(isAnnouncementActive(afterWindow, now)).toBe(false);
    });

    it('handles scheduled within range where now is before start', () => {
      const beforeWindow = {
        ...baseAnnouncement,
        startDate: '2026-11-20T00:00:00Z',
        expiryDate: '2026-11-25T00:00:00Z',
      };
      expect(isAnnouncementActive(beforeWindow, now)).toBe(false);
    });
  });

  describe('getAnnouncementStatus', () => {
    it('identifies inactive', () => {
      expect(getAnnouncementStatus({ ...baseAnnouncement, isActive: false }, now)).toBe('inactive');
    });

    it('identifies scheduled (future start)', () => {
      expect(
        getAnnouncementStatus({ ...baseAnnouncement, startDate: '2026-11-19T00:00:00Z' }, now)
      ).toBe('scheduled');
    });

    it('identifies expired (past expiry)', () => {
      expect(
        getAnnouncementStatus({ ...baseAnnouncement, expiryDate: '2026-11-17T00:00:00Z' }, now)
      ).toBe('expired');
    });

    it('identifies active', () => {
      expect(getAnnouncementStatus(baseAnnouncement, now)).toBe('active');
    });
  });

  describe('getActiveAnnouncement Database Retrieval', () => {
    it('retrieves active announcement respecting date boundaries and ordering', async () => {
      const activeRecord = {
        id: 'active-1',
        title: 'Current Notice',
        message: 'Active announcement content',
        isActive: true,
        startDate: null,
        expiryDate: null,
        linkText: null,
        linkUrl: null,
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T01:00:00Z'),
      };

      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(activeRecord);

      const result = await getActiveAnnouncement();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('active-1');
      expect(result?.title).toBe('Current Notice');

      expect(prisma.announcement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          orderBy: { updatedAt: 'desc' },
        })
      );
    });

    it('returns null when no active announcement matches and table has past records', async () => {
      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.announcement.count).mockResolvedValue(3);

      const result = await getActiveAnnouncement();
      expect(result).toBeNull();
    });

    it('falls back to DEFAULT_ANNOUNCEMENT when table has 0 records', async () => {
      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.announcement.count).mockResolvedValue(0);

      const result = await getActiveAnnouncement();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('initial-website-update');
      expect(result?.title).toBe("We're Updating Our Website!");
    });

    it('falls back to DEFAULT_ANNOUNCEMENT when table is unmigrated (P2021 error)', async () => {
      const missingTableErr = new Prisma.PrismaClientKnownRequestError(
        'Table does not exist',
        { code: 'P2021', clientVersion: '6.0.0' }
      );
      vi.mocked(prisma.announcement.findFirst).mockRejectedValue(missingTableErr);

      const result = await getActiveAnnouncement();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('initial-website-update');
    });

    it('returns null when database has a connection or runtime error (fails closed)', async () => {
      const dbErr = new Error('Database connection pool exhausted');
      vi.mocked(prisma.announcement.findFirst).mockRejectedValue(dbErr);

      const result = await getActiveAnnouncement();
      expect(result).toBeNull();
    });
  });

  describe('getLatestAnnouncement Database Retrieval', () => {
    it('retrieves latest updated announcement regardless of isActive', async () => {
      const record = {
        id: 'latest-1',
        title: 'Draft Announcement',
        message: 'Draft content',
        isActive: false,
        startDate: null,
        expiryDate: null,
        linkText: null,
        linkUrl: null,
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T05:00:00Z'),
      };

      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(record);

      const res = await getLatestAnnouncement();
      expect(res).not.toBeNull();
      expect(res?.id).toBe('latest-1');
      expect(res?.isActive).toBe(false);
    });
  });

  describe('DEFAULT_ANNOUNCEMENT', () => {
    it('has required initial title and message', () => {
      expect(DEFAULT_ANNOUNCEMENT.title).toBe(INITIAL_ANNOUNCEMENT_TITLE);
      expect(DEFAULT_ANNOUNCEMENT.message).toBe(INITIAL_ANNOUNCEMENT_MESSAGE);
      expect(DEFAULT_ANNOUNCEMENT.title).toBe("We're Updating Our Website!");
      expect(DEFAULT_ANNOUNCEMENT.message).toContain('previously available content may be temporarily inaccessible');
      expect(DEFAULT_ANNOUNCEMENT.message).toContain('— Team Entertain Lawyers');
      expect(DEFAULT_ANNOUNCEMENT.isActive).toBe(true);
    });
  });

  describe('serializeAnnouncement', () => {
    it('converts Dates and trims values into serializable record', () => {
      const input = {
        id: '123',
        title: '  Trimmed Title  ',
        message: '  Trimmed Message  ',
        isActive: true,
        startDate: new Date('2026-11-18T10:00:00Z'),
        expiryDate: new Date('2026-11-25T10:00:00Z'),
        linkText: '  Learn more  ',
        linkUrl: '  /updates  ',
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T01:00:00Z'),
      };

      const res = serializeAnnouncement(input);
      expect(res.id).toBe('123');
      expect(res.title).toBe('Trimmed Title');
      expect(res.message).toBe('Trimmed Message');
      expect(res.startDate).toBe('2026-11-18T10:00:00.000Z');
      expect(res.expiryDate).toBe('2026-11-25T10:00:00.000Z');
      expect(res.linkText).toBe('Learn more');
      expect(res.linkUrl).toBe('/updates');
      expect(typeof res.createdAt).toBe('string');
      expect(typeof res.updatedAt).toBe('string');
    });
  });
});
