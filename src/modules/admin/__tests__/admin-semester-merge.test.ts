import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

let mockUserRole = 'ADMIN';
let mockUserId = 'admin-user-id';

vi.mock('@/lib/safe-action', () => ({
  UserFacingError: class UserFacingError extends Error {},
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
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const p: any = {
    semester: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    subject: {
      delete: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    resource: {
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  p.$transaction = vi.fn(async (cb: any) => cb(p));
  return { prisma: p };
});

const VALID_SOURCE_ID = '62ceff9e-7c3f-467e-9810-72328b30f737';
const VALID_TARGET_ID = 'ef2ca3b8-f934-4174-a61c-79fdf531b856';

describe('admin-semester-merge.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'ADMIN';
  });

  describe('previewSemesterMergeAction', () => {
    it('rejects if caller is not ADMIN or EDITOR', async () => {
      mockUserRole = 'USER';
      const { previewSemesterMergeAction } = await import('../admin-semester-merge.actions');
      const res = await previewSemesterMergeAction({
        sourceId: VALID_SOURCE_ID,
        targetId: VALID_TARGET_ID,
      });
      if (!res.success) {
        expect(res.error).toContain('Unauthorized');
      } else {
        expect.fail('Action should have failed');
      }
    });

    it('rejects if sourceId equals targetId', async () => {
      const { previewSemesterMergeAction } = await import('../admin-semester-merge.actions');
      const res = await previewSemesterMergeAction({
        sourceId: VALID_SOURCE_ID,
        targetId: VALID_SOURCE_ID,
      });
      if (!res.success) {
        expect(res.error).toBe('Source and target semester must be different');
      } else {
        expect.fail('Action should have failed');
      }
    });

    it('generates correct preview detecting empty test subjects and direct resources', async () => {
      vi.mocked(prisma.semester.findUnique)
        .mockResolvedValueOnce({
          id: VALID_SOURCE_ID,
          name: 'S1',
          slug: null,
          order: 1,
          subjects: [
            {
              id: 'sub-1',
              name: 'Sub1',
              slug: null,
              order: 0,
              units: [],
              resources: [],
            },
          ],
          resources: [{ id: 'res-direct', type: 'OLD_QUESTION' }],
        } as any)
        .mockResolvedValueOnce({
          id: VALID_TARGET_ID,
          name: '1st Semester',
          slug: '1stsemester',
          order: 1,
          subjects: [
            {
              id: 'sub-2',
              name: 'Legal Methods',
              slug: 'legal-methods',
              order: 1,
              units: [{ id: 'u1' }],
              resources: [{ id: 'r1', type: 'LAW_NOTE' }],
            },
          ],
          resources: [],
        } as any);

      const { previewSemesterMergeAction } = await import('../admin-semester-merge.actions');
      const res = await previewSemesterMergeAction({
        sourceId: VALID_SOURCE_ID,
        targetId: VALID_TARGET_ID,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.source.name).toBe('S1');
        expect(res.data.source.subjectCount).toBe(1);
        expect(res.data.source.subjects[0].isEmpty).toBe(true);
        expect(res.data.source.directResourceCount).toBe(1);
        expect(res.data.target.name).toBe('1st Semester');
      }
    });
  });

  describe('mergeSemestersAction', () => {
    it('requires confirmation phrase CONFIRM', async () => {
      const { mergeSemestersAction } = await import('../admin-semester-merge.actions');
      const res = await mergeSemestersAction({
        sourceId: VALID_SOURCE_ID,
        targetId: VALID_TARGET_ID,
        confirmationPhrase: 'yes',
        removeEmptyTestSubjects: true,
        deleteSourceSemester: true,
      });

      if (!res.success) {
        expect(res.error).toBe('Please type "CONFIRM" to authorize this operation.');
      } else {
        expect.fail('Action should have failed');
      }
    });

    it('safely deletes empty test subjects, reassigns resources, and removes duplicate semester in transaction', async () => {
      vi.mocked(prisma.semester.findUnique)
        .mockResolvedValueOnce({
          id: VALID_SOURCE_ID,
          name: 'S1',
          subjects: [
            {
              id: 'sub-empty',
              name: 'Sub1',
              slug: null,
              units: [],
              resources: [],
            },
          ],
          resources: [{ id: 'res-direct' }],
        } as any)
        .mockResolvedValueOnce({
          id: VALID_TARGET_ID,
          name: '1st Semester',
          subjects: [],
        } as any);

      vi.mocked(prisma.resource.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.subject.delete).mockResolvedValue({} as any);
      vi.mocked(prisma.subject.count).mockResolvedValue(0);
      vi.mocked(prisma.resource.count).mockResolvedValue(0);
      vi.mocked(prisma.semester.delete).mockResolvedValue({} as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const { mergeSemestersAction } = await import('../admin-semester-merge.actions');
      const res = await mergeSemestersAction({
        sourceId: VALID_SOURCE_ID,
        targetId: VALID_TARGET_ID,
        confirmationPhrase: 'CONFIRM',
        removeEmptyTestSubjects: true,
        deleteSourceSemester: true,
      });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('semesters', { expire: 0 });
      expect(prisma.resource.updateMany).toHaveBeenCalledWith({
        where: { semesterId: VALID_SOURCE_ID },
        data: { semesterId: VALID_TARGET_ID },
      });
      expect(prisma.subject.delete).toHaveBeenCalledWith({
        where: { id: 'sub-empty' },
      });
      expect(prisma.semester.delete).toHaveBeenCalledWith({
        where: { id: VALID_SOURCE_ID },
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
