import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Role } from '@prisma/client';
import {
  saveAnnouncementAction,
  toggleAnnouncementActiveAction,
} from '../admin-announcement.actions';

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
    it('creates or updates announcement successfully for admin', async () => {
      const mockResult = {
        id: 'announcement-1',
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

      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.announcement.create).mockResolvedValue(mockResult);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: 'log-1',
        userId: adminId,
        action: 'CREATE',
        entityType: 'Announcement',
        entityId: 'announcement-1',
        details: null,
        createdAt: new Date(),
      });

      const res = await saveAnnouncementAction({
        title: "We're Updating Our Website!",
        message: 'Content is temporarily unavailable. We apologize for the inconvenience.',
        isActive: true,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.title).toBe("We're Updating Our Website!");
        expect(res.data.isActive).toBe(true);
      }

      expect(prisma.announcement.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminId,
            action: 'CREATE',
            entityType: 'Announcement',
          }),
        })
      );
    });

    it('rejects unauthorized users with Role.USER', async () => {
      (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'regular-user', role: Role.USER, email: 'user@example.com' },
        expires: '2026-12-31',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'regular-user',
        role: Role.USER,
      } as unknown as ReturnType<typeof prisma.user.findUnique> extends Promise<infer U> ? U : never);

      const res = await saveAnnouncementAction({
        title: 'Unauthorized Title',
        message: 'Unauthorized Message',
        isActive: true,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Forbidden|Unauthorized/i);
      }
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
    it('toggles isActive state successfully', async () => {
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
  });
});
