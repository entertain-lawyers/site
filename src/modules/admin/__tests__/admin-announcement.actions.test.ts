import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Role } from '@prisma/client';
import {
  saveAnnouncementAction,
  toggleAnnouncementActiveAction,
  getAnnouncementHistory,
} from '../admin-announcement.actions';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ANNOUNCEMENT_CACHE_TAG } from '@/lib/cache-tags';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    announcement: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Admin Announcement Actions Suite', () => {
  const adminId = 'admin-user-uuid';
  const editorId = 'editor-user-uuid';

  beforeEach(() => {
    vi.clearAllMocks();

    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: adminId, role: Role.ADMIN, email: 'admin@entertainlawyers.com' },
      expires: '2026-12-31',
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: adminId,
      role: Role.ADMIN,
    } as unknown as ReturnType<typeof prisma.user.findUnique> extends Promise<infer U> ? U : never);
  });

  describe('saveAnnouncementAction', () => {
    it('creates a new announcement record when mode is create or ID is absent', async () => {
      const mockResult = {
        id: 'announcement-new-uuid',
        title: "We're Updating Our Website!",
        message: 'Content is temporarily unavailable. We apologize for the inconvenience.',
        isActive: true,
        startDate: null,
        expiryDate: null,
        linkText: null,
        linkUrl: null,
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T01:00:00Z'),
      };

      vi.mocked(prisma.announcement.create).mockResolvedValue(mockResult);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: 'log-1',
        userId: adminId,
        action: 'CREATE',
        entityType: 'Announcement',
        entityId: mockResult.id,
        details: null,
        createdAt: new Date(),
      });

      const res = await saveAnnouncementAction({
        mode: 'create',
        title: "We're Updating Our Website!",
        message: 'Content is temporarily unavailable. We apologize for the inconvenience.',
        isActive: true,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe(mockResult.id);
        expect(res.data.title).toBe(mockResult.title);
      }

      expect(prisma.announcement.create).toHaveBeenCalledTimes(1);
      expect(prisma.announcement.update).not.toHaveBeenCalled();

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminId,
          action: 'CREATE',
          entityType: 'Announcement',
          entityId: mockResult.id,
        }),
      });

      expect(revalidateTag).toHaveBeenCalledWith(ANNOUNCEMENT_CACHE_TAG, { expire: 0 });
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('updates an existing announcement record when ID is provided', async () => {
      const existingId = 'existing-uuid-123';
      const mockResult = {
        id: existingId,
        title: 'Updated Title',
        message: 'Updated Message',
        isActive: true,
        startDate: null,
        expiryDate: null,
        linkText: null,
        linkUrl: null,
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T02:00:00Z'),
      };

      vi.mocked(prisma.announcement.findUnique).mockResolvedValue(mockResult);
      vi.mocked(prisma.announcement.update).mockResolvedValue(mockResult);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: 'log-update',
        userId: adminId,
        action: 'UPDATE',
        entityType: 'Announcement',
        entityId: existingId,
        details: null,
        createdAt: new Date(),
      });

      const res = await saveAnnouncementAction({
        id: existingId,
        title: 'Updated Title',
        message: 'Updated Message',
        isActive: true,
      });

      expect(res.success).toBe(true);
      expect(prisma.announcement.update).toHaveBeenCalledWith({
        where: { id: existingId },
        data: expect.objectContaining({
          title: 'Updated Title',
          message: 'Updated Message',
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entityId: existingId,
        }),
      });
    });

    it('rejects non-admin roles (USER and EDITOR)', async () => {
      // Mock session as EDITOR
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: editorId, role: Role.EDITOR, email: 'editor@entertainlawyers.com' },
        expires: '2026-12-31',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: editorId,
        role: Role.EDITOR,
      } as unknown as ReturnType<typeof prisma.user.findUnique> extends Promise<infer U> ? U : never);

      const resEditor = await saveAnnouncementAction({
        title: 'Editor Attempt',
        message: 'Should be rejected',
        isActive: true,
      });

      expect(resEditor.success).toBe(false);
      if (!resEditor.success) {
        expect(resEditor.error).toMatch(/Forbidden|Unauthorized/i);
      }
    });

    it('rejects protocol-relative and javascript links', async () => {
      const resProtocolRelative = await saveAnnouncementAction({
        title: 'Title',
        message: 'Message',
        isActive: true,
        linkUrl: '//evil.com',
      });
      expect(resProtocolRelative.success).toBe(false);

      const resJs = await saveAnnouncementAction({
        title: 'Title',
        message: 'Message',
        isActive: true,
        linkUrl: 'javascript:alert(1)',
      });
      expect(resJs.success).toBe(false);
    });

    it('accepts safe relative and HTTPS URLs', async () => {
      const mockResult = {
        id: 'announcement-url-test',
        title: 'Title',
        message: 'Message',
        isActive: true,
        startDate: null,
        expiryDate: null,
        linkText: 'Check Updates',
        linkUrl: '/news',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.announcement.create).mockResolvedValue(mockResult);

      const resRelative = await saveAnnouncementAction({
        title: 'Title',
        message: 'Message',
        isActive: true,
        linkText: 'Check Updates',
        linkUrl: '/news',
      });
      expect(resRelative.success).toBe(true);

      const resHttps = await saveAnnouncementAction({
        title: 'Title',
        message: 'Message',
        isActive: true,
        linkText: 'Check Updates',
        linkUrl: 'https://entertainlawyers.com/updates',
      });
      expect(resHttps.success).toBe(true);
    });

    it('rejects empty title or message', async () => {
      const res1 = await saveAnnouncementAction({
        title: '   ',
        message: 'Valid message body',
        isActive: true,
      });
      expect(res1.success).toBe(false);

      const res2 = await saveAnnouncementAction({
        title: 'Valid Title',
        message: '',
        isActive: true,
      });
      expect(res2.success).toBe(false);
    });

    it('rejects expiry date that is before start date', async () => {
      const res = await saveAnnouncementAction({
        title: 'Invalid Date Range',
        message: 'This should be rejected',
        isActive: true,
        startDate: '2026-11-20T10:00:00Z',
        expiryDate: '2026-11-19T10:00:00Z',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Expiry date must be after start date/i);
      }
    });
  });

  describe('toggleAnnouncementActiveAction', () => {
    it('toggles isActive state successfully for admin', async () => {
      vi.mocked(prisma.announcement.update).mockResolvedValue({
        id: 'announcement-1',
        title: 'Announcement 1',
        message: 'Message 1',
        isActive: false,
        startDate: null,
        expiryDate: null,
        linkText: null,
        linkUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: 'log-2',
        userId: adminId,
        action: 'UPDATE',
        entityType: 'Announcement',
        entityId: 'announcement-1',
        details: null,
        createdAt: new Date(),
      });

      const res = await toggleAnnouncementActiveAction({
        id: 'announcement-1',
        isActive: false,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.isActive).toBe(false);
      }

      expect(prisma.announcement.update).toHaveBeenCalledWith({
        where: { id: 'announcement-1' },
        data: { isActive: false },
      });
    });

    it('rejects non-admin role (EDITOR) on toggle', async () => {
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: editorId, role: Role.EDITOR, email: 'editor@entertainlawyers.com' },
        expires: '2026-12-31',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: editorId,
        role: Role.EDITOR,
      } as unknown as ReturnType<typeof prisma.user.findUnique> extends Promise<infer U> ? U : never);

      const res = await toggleAnnouncementActiveAction({
        id: 'announcement-1',
        isActive: false,
      });

      expect(res.success).toBe(false);
      expect(prisma.announcement.update).not.toHaveBeenCalled();
    });
  });

  describe('getAnnouncementHistory', () => {
    it('returns serialized list of announcements for authenticated admin', async () => {
      vi.mocked(prisma.announcement.findMany).mockResolvedValue([
        {
          id: 'ann-1',
          title: 'Title 1',
          message: 'Message 1',
          isActive: true,
          startDate: null,
          expiryDate: null,
          linkText: null,
          linkUrl: null,
          createdAt: new Date('2026-11-18T00:00:00Z'),
          updatedAt: new Date('2026-11-18T01:00:00Z'),
        },
      ]);

      const history = await getAnnouncementHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('ann-1');
      expect(history[0].title).toBe('Title 1');
    });

    it('throws error when user is unauthenticated', async () => {
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(getAnnouncementHistory()).rejects.toThrow(/Unauthorized/i);
    });

    it('throws error when user has EDITOR role', async () => {
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: editorId, role: Role.EDITOR, email: 'editor@entertainlawyers.com' },
        expires: '2026-12-31',
      });

      await expect(getAnnouncementHistory()).rejects.toThrow(/Unauthorized/i);
    });
  });
});
