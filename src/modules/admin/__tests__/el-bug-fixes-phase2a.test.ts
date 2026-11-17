/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentStatus, ResourceType, Role } from '@prisma/client';

// ---------------------------------------------------------
// Mocks for Actions, Prisma, Auth, Next/Cache & WordPress
// ---------------------------------------------------------
const {
  mockResource,
  mockSubject,
  mockSemester,
  mockUnit,
  mockAuditLog,
  mockUser,
} = vi.hoisted(() => ({
  mockResource: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  mockSubject: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockSemester: {
    findMany: vi.fn(),
  },
  mockUnit: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockAuditLog: {
    create: vi.fn(),
  },
  mockUser: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/b2', () => ({ deleteObject: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: mockUser,
    resource: mockResource,
    subject: mockSubject,
    semester: mockSemester,
    unit: mockUnit,
    auditLog: mockAuditLog,
    $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) =>
      fn({
        resource: mockResource,
        subject: mockSubject,
        unit: mockUnit,
        auditLog: mockAuditLog,
        user: mockUser,
      })
    ),
  },
}));

vi.mock('@/lib/wordpress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wordpress')>();
  return {
    ...actual,
    getWordPressPostById: vi.fn(),
  };
});

import { auth } from '@/lib/auth';
import { getWordPressPostById } from '@/lib/wordpress';
import { createResourceAction, updateResourceAction } from '../admin-resource.actions';
import AdminResourcesPage from '@/app/admin/study/resources/page';
import { getPublishedNewsPost } from '@/app/news/[id]/validate';
import { getPublicPostUrl } from '@/lib/post-url';
import { isBlogRouteType, wordPressArticlePath } from '@/lib/seo';
import {
  writePostPreviewDraft,
  isStudyResourceDraft,
  POST_PREVIEW_STORAGE_KEY,
  type PostPreviewDraft,
} from '@/lib/post-preview';

const TEST_ADMIN_ID = 'user-admin-uuid';
const TEST_SUBJECT_ID = 'sub-1111-1111-1111-111111111111';
const TEST_SEMESTER_ID = 'sem-2222-2222-2222-222222222222';
const TEST_UNIT_ID = 'unit-4444-4444-4444-444444444444';
const TEST_RESOURCE_ID = 'res-3333-3333-3333-333333333333';

function mockAdminSession() {
  (auth as any).mockResolvedValue({
    user: { id: TEST_ADMIN_ID, role: Role.ADMIN },
  });
  mockUser.findUnique.mockResolvedValue({
    id: TEST_ADMIN_ID,
    role: Role.ADMIN,
    name: 'Admin User',
  });
}

describe('Phase 2A Regression Test Suite: EL-BUG-01 through EL-BUG-05', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession();
    mockSubject.findUnique.mockResolvedValue({
      id: TEST_SUBJECT_ID,
      semesterId: TEST_SEMESTER_ID,
    });
    mockUnit.findUnique.mockResolvedValue({
      id: TEST_UNIT_ID,
      subjectId: TEST_SUBJECT_ID,
    });
  });

  // =========================================================================
  // EL-BUG-01: Admin Resource Creation & Update Semester Retention / Fallback
  // =========================================================================
  describe('EL-BUG-01: Admin Resource Semester Preservation, Fallback, and Explicit Null Distinction', () => {
    it('preserves explicit semesterId when creating non-OLD_QUESTION resources (e.g. LAW_NOTE)', async () => {
      mockResource.create.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Constitutional Law Notes',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'Constitutional Law Notes',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
        isPremium: false,
      });

      expect(res.success).toBe(true);
      expect(mockResource.create).toHaveBeenCalledTimes(1);
      const createArgs = mockResource.create.mock.calls[0][0];
      expect(createArgs.data.semesterId).toBe(TEST_SEMESTER_ID);
      expect(createArgs.data.subjectId).toBe(TEST_SUBJECT_ID);
    });

    it('falls back to resolving semesterId from subject when semesterId is omitted (undefined)', async () => {
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      mockResource.create.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Criminal Law Notes',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'Criminal Law Notes',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        // semesterId is omitted (undefined)
        isPremium: false,
      });

      expect(res.success).toBe(true);
      expect(mockSubject.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_SUBJECT_ID },
        select: { semesterId: true },
      });
      const createArgs = mockResource.create.mock.calls[0][0];
      expect(createArgs.data.semesterId).toBe(TEST_SEMESTER_ID);
    });

    it('preserves explicitly cleared semesterId (null) on create and does NOT fall back to subject', async () => {
      mockResource.create.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'General Reference Note',
        type: ResourceType.LAW_NOTE,
        semesterId: null,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'General Reference Note',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: null, // explicitly cleared
        isPremium: false,
      });

      expect(res.success).toBe(true);
      // Subject semester lookup must NOT be triggered when semesterId is explicitly null
      expect(mockSubject.findUnique).not.toHaveBeenCalled();
      const createArgs = mockResource.create.mock.calls[0][0];
      expect(createArgs.data.semesterId).toBeNull();
    });

    it('preserves semesterId on updateResourceAction and resolves from subject when omitted', async () => {
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      mockResource.update.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Updated Law Note',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: TEST_RESOURCE_ID,
        title: 'Updated Law Note',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        // semesterId omitted (undefined)
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(mockSubject.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_SUBJECT_ID },
        select: { semesterId: true },
      });
      const updateArgs = mockResource.update.mock.calls[0][0];
      expect(updateArgs.data.semesterId).toBe(TEST_SEMESTER_ID);
    });

    it('preserves explicitly cleared semesterId (null) on update and does NOT fall back to subject', async () => {
      mockResource.update.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Detached Note',
        type: ResourceType.LAW_NOTE,
        semesterId: null,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: TEST_RESOURCE_ID,
        title: 'Detached Note',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: null, // explicitly cleared
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(mockSubject.findUnique).not.toHaveBeenCalled();
      const updateArgs = mockResource.update.mock.calls[0][0];
      expect(updateArgs.data.semesterId).toBeNull();
    });

    it('propagates database errors thrown during subject semester resolution and aborts creation', async () => {
      mockSubject.findUnique.mockRejectedValue(new Error('Database query failure'));

      const res = await createResourceAction({
        title: 'Failing Resource',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        // omitted semesterId triggers lookup
        isPremium: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unexpected error/i);
      }
      expect(mockResource.create).not.toHaveBeenCalled();
    });

    it('demonstrates form create path payload logic (empty semester string -> undefined -> subject fallback)', async () => {
      // In AdminResourceForm create path: semesterId || undefined
      const formSemesterIdState = ''; // user unselected or left semester empty
      const submittedSemesterId = formSemesterIdState || undefined;
      expect(submittedSemesterId).toBeUndefined();

      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      mockResource.create.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Form Created Note',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'Form Created Note',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: submittedSemesterId,
        isPremium: false,
      });

      expect(res.success).toBe(true);
      expect(mockSubject.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_SUBJECT_ID },
        select: { semesterId: true },
      });
      const createArgs = mockResource.create.mock.calls[0][0];
      expect(createArgs.data.semesterId).toBe(TEST_SEMESTER_ID);
    });

    it('demonstrates form edit path payload logic (empty semester string -> null -> explicit null cleared)', async () => {
      // In AdminResourceForm edit path: semesterId ? semesterId : null
      const formSemesterIdState = ''; // user explicitly unselected semester on edit
      const submittedSemesterId = formSemesterIdState ? formSemesterIdState : null;
      expect(submittedSemesterId).toBeNull();

      mockResource.update.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Form Updated Note',
        type: ResourceType.LAW_NOTE,
        semesterId: null,
        subjectId: TEST_SUBJECT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: TEST_RESOURCE_ID,
        title: 'Form Updated Note',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: submittedSemesterId,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(mockSubject.findUnique).not.toHaveBeenCalled();
      const updateArgs = mockResource.update.mock.calls[0][0];
      expect(updateArgs.data.semesterId).toBeNull();
    });

    it('creates a resource with explicitly selected semester, subject, and unit', async () => {
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      mockUnit.findUnique.mockResolvedValue({
        id: TEST_UNIT_ID,
        subjectId: TEST_SUBJECT_ID,
      });
      mockResource.create.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Unit 1 Criminal Law Notes',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        unitId: TEST_UNIT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'Unit 1 Criminal Law Notes',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
        unitId: TEST_UNIT_ID,
        isPremium: false,
      });

      expect(res.success).toBe(true);
      const createArgs = mockResource.create.mock.calls[0][0];
      expect(createArgs.data.semesterId).toBe(TEST_SEMESTER_ID);
      expect(createArgs.data.subjectId).toBe(TEST_SUBJECT_ID);
      expect(createArgs.data.unitId).toBe(TEST_UNIT_ID);
    });

    it('rejects resource creation when unit does not belong to the selected subject', async () => {
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      // Unit belongs to a DIFFERENT subject
      mockUnit.findUnique.mockResolvedValue({
        id: TEST_UNIT_ID,
        subjectId: 'sub-other-subject-uuid',
      });

      const res = await createResourceAction({
        title: 'Mismatched Unit Resource',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
        unitId: TEST_UNIT_ID,
        isPremium: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected unit does not belong to the selected subject/i);
      }
      expect(mockResource.create).not.toHaveBeenCalled();
    });

    it('rejects resource creation when subject does not belong to the selected semester', async () => {
      // Subject belongs to Semester 1, but user passed Semester 2
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: 'sem-semester-1-uuid',
      });

      const res = await createResourceAction({
        title: 'Mismatched Semester Resource',
        type: ResourceType.LAW_NOTE,
        subjectId: TEST_SUBJECT_ID,
        semesterId: 'sem-semester-2-uuid',
        isPremium: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected subject does not belong to the selected semester/i);
      }
      expect(mockResource.create).not.toHaveBeenCalled();
    });

    it('rejects Old Questions assigned to a subject or unit', async () => {
      const resWithSubject = await createResourceAction({
        title: 'Invalid Old Question with Subject',
        type: ResourceType.OLD_QUESTION,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        isPremium: false,
      });
      expect(resWithSubject.success).toBe(false);
      if (!resWithSubject.success) {
        expect(resWithSubject.error).toMatch(/old questions cannot be assigned to a subject/i);
      }

      const resWithUnit = await createResourceAction({
        title: 'Invalid Old Question with Unit',
        type: ResourceType.OLD_QUESTION,
        semesterId: TEST_SEMESTER_ID,
        unitId: TEST_UNIT_ID,
        isPremium: false,
      });
      expect(resWithUnit.success).toBe(false);
      if (!resWithUnit.success) {
        expect(resWithUnit.error).toMatch(/old questions cannot be assigned to a unit/i);
      }
    });

    it('updates an existing resource and changes its semester, subject, and unit', async () => {
      const NEW_SEMESTER_ID = 'sem-new-3333-3333';
      const NEW_SUBJECT_ID = 'sub-new-4444-4444';
      const NEW_UNIT_ID = 'unit-new-5555-5555';

      mockSubject.findUnique.mockResolvedValue({
        id: NEW_SUBJECT_ID,
        semesterId: NEW_SEMESTER_ID,
      });
      mockUnit.findUnique.mockResolvedValue({
        id: NEW_UNIT_ID,
        subjectId: NEW_SUBJECT_ID,
      });
      mockResource.update.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Relocated Law Note',
        type: ResourceType.LAW_NOTE,
        semesterId: NEW_SEMESTER_ID,
        subjectId: NEW_SUBJECT_ID,
        unitId: NEW_UNIT_ID,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: TEST_RESOURCE_ID,
        title: 'Relocated Law Note',
        type: ResourceType.LAW_NOTE,
        semesterId: NEW_SEMESTER_ID,
        subjectId: NEW_SUBJECT_ID,
        unitId: NEW_UNIT_ID,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      const updateArgs = mockResource.update.mock.calls[0][0];
      expect(updateArgs.data.semesterId).toBe(NEW_SEMESTER_ID);
      expect(updateArgs.data.subjectId).toBe(NEW_SUBJECT_ID);
      expect(updateArgs.data.unitId).toBe(NEW_UNIT_ID);
    });

    it('clears unit selection on update when unitId is null', async () => {
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      mockResource.update.mockResolvedValue({
        id: TEST_RESOURCE_ID,
        title: 'Unit Cleared Note',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        unitId: null,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: TEST_RESOURCE_ID,
        title: 'Unit Cleared Note',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        unitId: null,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      const updateArgs = mockResource.update.mock.calls[0][0];
      expect(updateArgs.data.unitId).toBeNull();
    });

    it('rejects resource update when unit does not belong to subject', async () => {
      mockSubject.findUnique.mockResolvedValue({
        id: TEST_SUBJECT_ID,
        semesterId: TEST_SEMESTER_ID,
      });
      mockUnit.findUnique.mockResolvedValue({
        id: TEST_UNIT_ID,
        subjectId: 'sub-different-subject',
      });

      const res = await updateResourceAction({
        id: TEST_RESOURCE_ID,
        title: 'Invalid Update Unit',
        type: ResourceType.LAW_NOTE,
        semesterId: TEST_SEMESTER_ID,
        subjectId: TEST_SUBJECT_ID,
        unitId: TEST_UNIT_ID,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/selected unit does not belong to the selected subject/i);
      }
      expect(mockResource.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // EL-BUG-02: Admin Study Resources Filter Semester Clause (Direct or via Subject)
  // =========================================================================
  describe('EL-BUG-02: Admin Study Resources Semester Filter Matching', () => {
    it('queries both direct semesterId and subject.is.semesterId when filtering by semester', async () => {
      mockSemester.findMany.mockResolvedValue([{ id: TEST_SEMESTER_ID, name: 'Semester 1' }]);
      mockSubject.findMany.mockResolvedValue([]);
      mockResource.groupBy.mockResolvedValue([]);
      mockResource.count.mockResolvedValue(5);
      mockResource.findMany.mockResolvedValue([]);

      await AdminResourcesPage({
        searchParams: Promise.resolve({ semester: TEST_SEMESTER_ID }),
      });

      expect(mockResource.findMany).toHaveBeenCalled();
      const findArgs = mockResource.findMany.mock.calls[0][0];
      const andClauses = findArgs.where.AND;

      const semesterClause = andClauses.find(
        (c: any) =>
          Array.isArray(c.OR) &&
          c.OR.some((sub: any) => sub.semesterId === TEST_SEMESTER_ID)
      );

      expect(semesterClause).toBeDefined();
      expect(semesterClause.OR).toEqual([
        { semesterId: TEST_SEMESTER_ID },
        { subject: { is: { semesterId: TEST_SEMESTER_ID } } },
      ]);
    });
  });

  // =========================================================================
  // EL-BUG-03: Preview Layout Identification (Explicit RESOURCE vs POST)
  // =========================================================================
  describe('EL-BUG-03: Explicit RESOURCE vs POST Preview Identification', () => {
    it('writes explicit contentType: RESOURCE when drafting a resource preview', () => {
      const storage: Record<string, string> = {};
      const localStorageMock = {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          storage[key] = value;
        }),
      };
      vi.stubGlobal('window', { localStorage: localStorageMock });

      writePostPreviewDraft({
        contentType: 'RESOURCE',
        title: 'Draft Criminal Code Summary',
        content: '<p>Summary</p>',
        type: 'Law Note',
        editorUrl: '/admin/study/resources/new',
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const raw = storage[POST_PREVIEW_STORAGE_KEY];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!) as PostPreviewDraft;
      expect(parsed.contentType).toBe('RESOURCE');
      expect(parsed.title).toBe('Draft Criminal Code Summary');

      vi.unstubAllGlobals();
    });

    it('writes explicit contentType: POST when drafting an editorial post preview', () => {
      const storage: Record<string, string> = {};
      const localStorageMock = {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          storage[key] = value;
        }),
      };
      vi.stubGlobal('window', { localStorage: localStorageMock });

      writePostPreviewDraft({
        contentType: 'POST',
        title: 'Legal Sector News Update',
        content: '<p>News content</p>',
        type: 'NEWS',
        editorUrl: '/admin/posts/new',
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const raw = storage[POST_PREVIEW_STORAGE_KEY];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!) as PostPreviewDraft;
      expect(parsed.contentType).toBe('POST');

      vi.unstubAllGlobals();
    });

    it('defaults contentType to POST when omitted by legacy callers', () => {
      const storage: Record<string, string> = {};
      const localStorageMock = {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          storage[key] = value;
        }),
      };
      vi.stubGlobal('window', { localStorage: localStorageMock });

      writePostPreviewDraft({
        title: 'Legacy Draft',
        content: '<p>Content</p>',
        type: 'BLOG',
      });

      const raw = storage[POST_PREVIEW_STORAGE_KEY];
      const parsed = JSON.parse(raw!) as PostPreviewDraft;
      expect(parsed.contentType).toBe('POST');

      vi.unstubAllGlobals();
    });

    it('uses explicit contentType as primary discriminator regardless of type or url heuristics', () => {
      // Explicit RESOURCE overrides any editorial type/URL
      expect(
        isStudyResourceDraft({
          contentType: 'RESOURCE',
          editorUrl: '/admin/posts/101/edit',
          type: 'NEWS',
        })
      ).toBe(true);

      // Explicit POST overrides any study type/URL
      expect(
        isStudyResourceDraft({
          contentType: 'POST',
          editorUrl: '/admin/study/resources/new',
          type: 'Law Note',
        })
      ).toBe(false);
    });

    it('falls back to URL and type heuristics for legacy drafts where contentType is undefined', () => {
      // Legacy draft with study editor URL
      expect(
        isStudyResourceDraft({
          contentType: undefined,
          editorUrl: '/admin/study/resources/123/edit',
          type: 'Arbitrary',
        })
      ).toBe(true);

      // Legacy draft with recognized study type
      expect(
        isStudyResourceDraft({
          contentType: undefined,
          editorUrl: '/admin/posts/new',
          type: 'LAW_NOTE',
        })
      ).toBe(true);

      expect(
        isStudyResourceDraft({
          contentType: undefined,
          type: 'Case Law',
        })
      ).toBe(true);

      // Legacy draft that is purely editorial
      expect(
        isStudyResourceDraft({
          contentType: undefined,
          editorUrl: '/admin/posts/new',
          type: 'NEWS',
        })
      ).toBe(false);

      expect(
        isStudyResourceDraft({
          contentType: undefined,
          editorUrl: '/admin/posts/45/edit',
          type: 'OPINION',
        })
      ).toBe(false);
    });
  });

  // =========================================================================
  // EL-BUG-04: News Post Validation with Multi-Category Tags
  // =========================================================================
  describe('EL-BUG-04: getPublishedNewsPost Multi-Category Support', () => {
    it('allows a published post that includes category 58 alongside opinion category 60', async () => {
      (getWordPressPostById as any).mockResolvedValue({
        id: 101,
        slug: 'multi-cat-news',
        status: 'publish',
        categories: [58, 60], // News + Opinion
        title: { rendered: 'Breaking News with Opinion' },
      });

      const post = await getPublishedNewsPost('101');
      expect(post).not.toBeNull();
      expect(post?.id).toBe(101);
    });

    it('allows a published post that has single news category 58', async () => {
      (getWordPressPostById as any).mockResolvedValue({
        id: 102,
        slug: 'pure-news',
        status: 'publish',
        categories: [58],
        title: { rendered: 'Pure News' },
      });

      const post = await getPublishedNewsPost('102');
      expect(post).not.toBeNull();
      expect(post?.id).toBe(102);
    });

    it('rejects a post that only has opinion category 60 and not news 58', async () => {
      (getWordPressPostById as any).mockResolvedValue({
        id: 103,
        slug: 'opinion-only',
        status: 'publish',
        categories: [60],
        title: { rendered: 'Opinion Piece' },
      });

      const post = await getPublishedNewsPost('103');
      expect(post).toBeNull();
    });

    it('rejects a news post that is not published (draft)', async () => {
      (getWordPressPostById as any).mockResolvedValue({
        id: 104,
        slug: 'draft-news',
        status: 'draft',
        categories: [58],
        title: { rendered: 'Draft News' },
      });

      const post = await getPublishedNewsPost('104');
      expect(post).toBeNull();
    });

    it('returns null when segment does not resolve to a numeric WordPress ID', async () => {
      const post = await getPublishedNewsPost('invalid-slug-without-id');
      expect(post).toBeNull();
      expect(getWordPressPostById).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // EL-BUG-05: Case Law Routing and Restored PERSONALITY Assertion
  // =========================================================================
  describe('EL-BUG-05: Case Law Routing and Restored PERSONALITY URL Assertion', () => {
    it('routes WordPress numeric CASE_LAW (category 113) to /blogs/:id', () => {
      const url = getPublicPostUrl({ id: 128, type: 'CASE_LAW', lang: 'en' });
      expect(url).toBe('/blogs/128');
    });

    it('routes Prisma UUID CASE_LAW to /resources/:id', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const url = getPublicPostUrl({ id: uuid, type: 'CASE_LAW', lang: 'en' });
      expect(url).toBe(`/resources/${uuid}`);
    });

    it('preserves existing PERSONALITY routing regression assertion to /historical-facts/:id', () => {
      const url = getPublicPostUrl({ id: 127, type: 'PERSONALITY', lang: 'en' });
      expect(url).toBe('/historical-facts/127');
    });

    it('confirms CASE_LAW is recognized as blog route type in SEO helper', () => {
      expect(isBlogRouteType('CASE_LAW')).toBe(true);
      expect(wordPressArticlePath('CASE_LAW', 128, 'en')).toBe('/blogs/128');
    });
  });
});
