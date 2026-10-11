import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { loadTeamBackupData, teamImportItemSchema } from '../admin-team-import.helpers';

let mockUserRole = 'ADMIN';
let mockUserId = 'admin-user-id';

vi.mock('@/lib/safe-action', () => ({
  createSafeAction: (fn: any) => async (args: any) => {
    try {
      const result = await fn(args, { role: mockUserRole, userId: mockUserId });
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('admin-team-import.actions & Data Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'ADMIN';
  });

  describe('Backup Data & Photo Mapping Integrity', () => {
    it('successfully loads and validates all 5 team profiles from team_members_backup.json', () => {
      const items = loadTeamBackupData();
      expect(items.length).toBe(5);

      for (const item of items) {
        const validated = teamImportItemSchema.safeParse(item);
        expect(validated.success).toBe(true);
        expect(item.name).toBeTruthy();
        expect(item.slug).toBeTruthy();
        expect(item.designation).toBeTruthy();
      }
    });

    it('verifies all 5 referenced photos physically exist in public/uploads/editorial/team/', () => {
      const items = loadTeamBackupData();
      const photosDir = path.join(process.cwd(), 'public/uploads/editorial/team');

      for (const item of items) {
        expect(item.imageUrl).toBeTruthy();
        const filename = item.imageUrl!.split('/').pop();
        expect(filename).toBeTruthy();

        const fullPath = path.join(photosDir, filename!);
        expect(fs.existsSync(fullPath)).toBe(true);
        const stat = fs.statSync(fullPath);
        expect(stat.size).toBeGreaterThan(1000); // Valid image file
      }
    });

    it('confirms Instagram and Achievements fields are populated for relevant profiles', () => {
      const items = loadTeamBackupData();
      const sushma = items.find((i) => i.slug === 'sushma-acharya');
      expect(sushma).toBeDefined();
      expect(sushma?.instagramUrl).toBe('https://www.instagram.com/shusma_acharya/');
      expect(sushma?.achievements).toContain('Moot Court Competition');

      const smriti = items.find((i) => i.slug === 'smriti-sharma');
      expect(smriti).toBeDefined();
      expect(smriti?.instagramUrl).toBe('https://www.instagram.com/_sh.smriti');
      expect(smriti?.achievements).toContain('Human Rights');
    });
  });

  describe('previewTeamImportAction', () => {
    it('rejects unauthenticated or non-admin/editor users', async () => {
      mockUserRole = 'USER';
      const { previewTeamImportAction } = await import('../admin-team-import.actions');
      const res = await previewTeamImportAction();
      if (!res.success) {
        expect(res.error).toContain('Unauthorized');
      } else {
        expect.fail('Action should have failed');
      }
    });

    it('returns preview with proper B2 media URL mappings and local photo statuses', async () => {
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);

      const { previewTeamImportAction } = await import('../admin-team-import.actions');
      const res = await previewTeamImportAction();

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.total).toBe(5);
        expect(res.data.localPhotosFoundCount).toBe(5);
        expect(res.data.localPhotosMissingCount).toBe(0);

        for (const previewItem of res.data.items) {
          expect(previewItem.photoExistsLocally).toBe(true);
          expect(previewItem.targetPublicUrl).toMatch(/^\/api\/media\/editorial\/team\/.+\.jpg$/);
          // Strictly must not be local /uploads/
          expect(previewItem.targetPublicUrl).not.toContain('/uploads/');
        }
      }
    });
  });

  describe('executeTeamImportAction', () => {
    it('executes idempotent upsert, keeps profiles unpublished by default, and creates audit logs', async () => {
      // Simulate that Ram Babu Das already exists in DB
      (prisma.teamMember.findFirst as any).mockImplementation(async ({ where }: any) => {
        const matchesSlug = where?.OR?.some((cond: any) => cond.slug === 'ram-babu-das');
        if (matchesSlug) {
          return { id: 'acc06d44-97d3-44e5-bc4a-0a2de6df5585', slug: 'ram-babu-das' } as any;
        }
        return null;
      });

      vi.mocked(prisma.teamMember.update).mockResolvedValue({ id: 'updated-id' } as any);
      vi.mocked(prisma.teamMember.create).mockResolvedValue({ id: 'created-id' } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const { executeTeamImportAction } = await import('../admin-team-import.actions');
      const res = await executeTeamImportAction({
        uploadPhotosToStorage: false, // Don't upload to remote S3 during unit test
        forcePublish: false,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.total).toBe(5);
        expect(res.data.updatedCount).toBe(1); // Ram Babu Das updated
        expect(res.data.createdCount).toBe(4); // Remaining 4 created
      }

      // Check that update called with isPublished: false
      expect(prisma.teamMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublished: false,
            imageUrl: expect.stringMatching(/^\/api\/media\/editorial\/team\//),
          }),
        })
      );

      // Check that create called with isPublished: false
      expect(prisma.teamMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublished: false,
            imageUrl: expect.stringMatching(/^\/api\/media\/editorial\/team\//),
          }),
        })
      );
    });
  });
});
