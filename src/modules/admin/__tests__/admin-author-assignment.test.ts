/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma, Role, ResourceType, ContentStatus } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock wordpress client, but keep the real error classes so the production
// `instanceof` checks behave exactly as they do at runtime. Tests that need
// the real resolution path point `getWordPressAuthenticatedUser` back at the
// actual implementation and stub fetch.
vi.mock('@/lib/wordpress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wordpress')>();
  return {
  createWordPressPost: vi.fn().mockImplementation(async (input, lang) => ({
    id: 101,
    title: { rendered: input.title },
    content: { rendered: input.content },
    status: input.status,
    author: input.author,
    lang,
  })),
  updateWordPressPost: vi.fn().mockImplementation(async (id, input, lang) => ({
    id,
    title: { rendered: input.title },
    content: { rendered: input.content },
    status: input.status,
    author: input.author,
    lang,
  })),
  listWordPressAuthors: vi.fn().mockImplementation(async (lang) => {
    if (lang === 'ne') throw new Error('Nepali WP unreachable (401)');
    return [
      { id: 24, name: 'Admin Author', slug: 'admin-author' },
      { id: 30, name: 'Editor Writer', slug: 'editor-writer' },
    ];
  }),
  getWordPressAuthor: vi.fn().mockImplementation(async (id) => {
    if (id === 99) return { id: 99, name: 'Unmapped WP User', slug: 'unmapped-wp' };
    return null;
  }),
  // One distinct publishing account per install: an English/Nepali mix-up
  // would make a post land under the wrong byline on the wrong site.
  getWordPressAuthenticatedUser: vi.fn().mockImplementation(async (lang: 'en' | 'ne') => {
    if (lang === 'ne') return { id: 602, name: 'Nepali Publisher', slug: 'nepali-publisher' };
    return { id: 501, name: 'English Publisher', slug: 'english-publisher' };
  }),
  mapTypeToCategory: vi.fn().mockReturnValue([61]),
  toWordPressWriteError: vi.fn((err: any) => err),
  WordPressAuthError: actual.WordPressAuthError,
  WordPressApiError: actual.WordPressApiError,
  };
});

// The real module, for the error-propagation suite. The suite above keeps the
// WordPress write calls stubbed; this reference lets the auth resolver run its
// genuine `fetchWordPress` -> `/users/me` path against a stubbed global fetch.
const actualWordPress = await vi.importActual<typeof import('@/lib/wordpress')>('@/lib/wordpress');

// Test database fixtures
const mockUsers = [
  {
    id: 'user-admin',
    name: 'Dev Admin',
    email: 'admin@entertainlawyers.com',
    role: Role.ADMIN,
    wpAuthorIdEn: 24,
    wpAuthorIdNe: 42,
  },
  {
    id: 'user-editor',
    name: 'Staff Editor',
    email: 'editor@entertainlawyers.com',
    role: Role.EDITOR,
    wpAuthorIdEn: 30,
    wpAuthorIdNe: null, // missing Nepali mapping
  },
  {
    id: 'user-unmapped',
    name: 'Unmapped Editor',
    email: 'unmapped@entertainlawyers.com',
    role: Role.EDITOR,
    wpAuthorIdEn: null,
    wpAuthorIdNe: null,
  },
  {
    id: 'user-normal',
    name: 'Normal Student',
    email: 'student@example.com',
    role: Role.USER,
    wpAuthorIdEn: null,
    wpAuthorIdNe: null,
  },
];

const mockAuditLogs: any[] = [];
let mockCreatedResource: any = null;
let mockUpdatedResource: any = null;

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(async (query?: any) => {
        if (query?.where?.role?.in) {
          return mockUsers.filter((u) => query.where.role.in.includes(u.role));
        }
        return mockUsers;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return mockUsers.find((u) => u.id === where.id) ?? null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          mockUsers.find((u) => {
            if (where.wpAuthorIdEn && u.wpAuthorIdEn === where.wpAuthorIdEn && u.id !== where.id?.not) {
              return true;
            }
            if (where.wpAuthorIdNe && u.wpAuthorIdNe === where.wpAuthorIdNe && u.id !== where.id?.not) {
              return true;
            }
            return false;
          }) ?? null
        );
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
    resource: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        mockCreatedResource = { id: 'res-new-1', ...data };
        return mockCreatedResource;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        mockUpdatedResource = { id: where.id, ...data };
        return mockUpdatedResource;
      }),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id === 'res-null-author') {
          return {
            id: 'res-null-author',
            title: 'Old Resource',
            authorId: null,
            createdById: 'user-admin',
            status: ContentStatus.PUBLISHED,
          };
        }
        return mockCreatedResource || null;
      }),
    },
    auditLog: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        mockAuditLogs.push(data);
        return { id: `audit-${mockAuditLogs.length}`, ...data };
      }),
    },
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return callback(prisma);
    }),
  },
}));

import { prisma } from '@/lib/prisma';

import {
  CONTENT_AUTHOR_ROLES,
  isContentAuthorRole,
  listLocalAuthors,
  listLocalAuthorsWithStatus,
  resolveLocalAuthor,
  resolveWordPressAuthor,
  listWordPressAuthorsSafe,
} from '@/lib/content-authors';
import { createPostAction, updatePostAction } from '@/modules/admin/admin-post.actions';
import { createResourceAction, updateResourceAction } from '@/modules/admin/admin-resource.actions';
import { updateUserAction } from '@/modules/admin/admin-user.actions';
import {
  createWordPressPost,
  updateWordPressPost,
  getWordPressAuthenticatedUser,
  WordPressAuthError,
} from '@/lib/wordpress';
import { getInitialResourceAuthorId, getSubmittedResourceAuthorId } from '@/components/admin/resource-form-author';

describe('Author Assignment & Attribution Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogs.length = 0;
    mockCreatedResource = null;
    mockUpdatedResource = null;

    // Default to admin auth session
    (auth as any).mockResolvedValue({
      user: { id: 'user-admin', email: 'admin@entertainlawyers.com', role: Role.ADMIN },
    });
  });

  // 1. Eligible role filtering
  describe('1. Eligible role filtering', () => {
    it('only allows ADMIN and EDITOR roles as content authors', async () => {
      expect(CONTENT_AUTHOR_ROLES).toContain(Role.ADMIN);
      expect(CONTENT_AUTHOR_ROLES).toContain(Role.EDITOR);
      expect(CONTENT_AUTHOR_ROLES).not.toContain(Role.USER);

      expect(isContentAuthorRole(Role.ADMIN)).toBe(true);
      expect(isContentAuthorRole(Role.EDITOR)).toBe(true);
      expect(isContentAuthorRole(Role.USER)).toBe(false);

      const eligibleAuthors = await listLocalAuthors();
      expect(eligibleAuthors.every((a) => a.role === Role.ADMIN || a.role === Role.EDITOR)).toBe(true);
      expect(eligibleAuthors.some((a) => a.id === 'user-normal')).toBe(false);
    });

    it('rejects assigning a USER role as a content author', async () => {
      await expect(resolveLocalAuthor('user-normal')).rejects.toThrow(
        /Only administrators and editors can be assigned as content authors/i
      );
    });
  });

  // 2. Default author selection
  describe('2. Default author selection', () => {
    it('defaults resource author to the logged-in user when authorUserId is not provided', async () => {
      (auth as any).mockResolvedValue({
        user: { id: 'user-editor', email: 'editor@entertainlawyers.com', role: Role.EDITOR },
      });

      const res = await createResourceAction({
        title: 'Jurisprudence Lecture Notes',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(mockCreatedResource.authorId).toBe('user-editor');
      expect(mockCreatedResource.createdById).toBe('user-editor');
    });

    it('creates WordPress post under API user when no authorUserId is provided', async () => {
      const res = await createPostAction({
        title: 'New Legal Insight',
        content: '<p>Body text</p>',
        type: 'NEWS',
      });

      expect(res.success).toBe(true);
      expect(createWordPressPost).toHaveBeenCalledWith(
        expect.not.objectContaining({ author: expect.anything() }),
        'en'
      );
    });
  });

  // 3. English WordPress author resolution
  describe('3. English WordPress author resolution', () => {
    it('resolves mapped English WordPress author ID correctly', async () => {
      const resolved = await resolveWordPressAuthor('user-admin', 'en');
      expect(resolved.author.id).toBe('user-admin');
      expect(resolved.wpAuthorId).toBe(24);
    });
  });

  // 4. Nepali WordPress author resolution
  describe('4. Nepali WordPress author resolution', () => {
    it('resolves mapped Nepali WordPress author ID correctly', async () => {
      const resolved = await resolveWordPressAuthor('user-admin', 'ne');
      expect(resolved.author.id).toBe('user-admin');
      expect(resolved.wpAuthorId).toBe(42);
    });
  });

  // 5. Missing/unavailable mapping handling
  describe('5. Missing/unavailable mapping handling', () => {
    it('throws clear error when local author lacks WordPress mapping for target language', async () => {
      await expect(resolveWordPressAuthor('user-editor', 'ne')).rejects.toThrow(
        /not linked to a Nepali WordPress author account/i
      );
      await expect(resolveWordPressAuthor('user-unmapped', 'en')).rejects.toThrow(
        /not linked to an English WordPress author account/i
      );
    });

    it('safely handles failed or unauthorized WordPress author listing without crashing', async () => {
      const res = await listWordPressAuthorsSafe('ne');
      expect(res.authors).toEqual([]);
      expect(res.error).toMatch(/Nepali WordPress author accounts could not be loaded/i);
    });
  });

  // 6. Existing unmapped WordPress author preservation
  describe('6. Existing unmapped WordPress author preservation', () => {
    it('preserves existing WordPress author on edit when authorUserId is omitted', async () => {
      const res = await updatePostAction({
        id: 101,
        title: 'Updated Post Without Author Reassignment',
        lang: 'en',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        101,
        expect.not.objectContaining({ author: expect.anything() }),
        'en'
      );
    });
  });

  // 7. Correct WordPress author assignment on create/update
  describe('7. Correct WordPress author assignment on create/update', () => {
    it('passes resolved author ID to createWordPressPost', async () => {
      const res = await createPostAction({
        title: 'Article Attributed to Staff Editor',
        content: '<p>Content</p>',
        type: 'OPINION',
        authorUserId: 'user-editor',
      });

      expect(res.success).toBe(true);
      expect(createWordPressPost).toHaveBeenCalledWith(
        expect.objectContaining({ author: 30 }),
        'en'
      );
    });

    it('passes resolved author ID to updateWordPressPost on reassignment', async () => {
      const res = await updatePostAction({
        id: 101,
        title: 'Article Reassigned to Dev Admin',
        authorUserId: 'user-admin',
        lang: 'en',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        101,
        expect.objectContaining({ author: 24 }),
        'en'
      );
    });

    it('assigns the publishing account explicitly when an unmapped editor creates an English post', async () => {
      const res = await createPostAction({
        title: 'Article Attributed to Unmapped Editor',
        content: '<p>Content</p>',
        type: 'OPINION',
        authorUserId: 'user-unmapped',
      });

      expect(res.success).toBe(true);
      expect(createWordPressPost).toHaveBeenCalledWith(
        expect.objectContaining({ author: 501 }),
        'en'
      );
      expect(mockAuditLogs.at(-1)?.details).toMatchObject({
        authorUserId: 'user-unmapped',
        authorName: 'Unmapped Editor',
        wpAuthorId: 501,
      });
    });

    it('assigns the publishing account explicitly when an unmapped editor updates an English post', async () => {
      const res = await updatePostAction({
        id: 101,
        title: 'Article Updated to Unmapped Editor',
        authorUserId: 'user-unmapped',
        lang: 'en',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        101,
        expect.objectContaining({ author: 501 }),
        'en'
      );
      expect(mockAuditLogs.at(-1)?.details).toMatchObject({
        authorUserId: 'user-unmapped',
        authorName: 'Unmapped Editor',
        wpAuthorId: 501,
      });
    });

    it('uses the Nepali publishing account for an unmapped Nepali post, never the English one', async () => {
      const created = await createPostAction({
        title: 'नेपाली लेख',
        content: '<p>सामग्री</p>',
        type: 'NEPALI_SAMANYA_SAMACHAR',
        authorUserId: 'user-unmapped',
      });

      expect(created.success).toBe(true);
      expect(createWordPressPost).toHaveBeenCalledWith(
        expect.objectContaining({ author: 602 }),
        'ne'
      );
      expect(createWordPressPost).not.toHaveBeenCalledWith(
        expect.objectContaining({ author: 501 }),
        expect.anything()
      );
      expect(mockAuditLogs.at(-1)?.details).toMatchObject({ wpAuthorId: 602 });
    });

    it('uses the Nepali publishing account when updating an unmapped Nepali post', async () => {
      const res = await updatePostAction({
        id: 303,
        title: 'नेपाली लेख अद्यावधिक',
        authorUserId: 'user-unmapped',
        lang: 'ne',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        303,
        expect.objectContaining({ author: 602 }),
        'ne'
      );
      expect(mockAuditLogs.at(-1)?.details).toMatchObject({ wpAuthorId: 602 });
    });

    it('keeps an explicit Nepali mapping instead of the publishing account', async () => {
      const res = await updatePostAction({
        id: 303,
        title: 'नेपाली लेख अद्यावधिक',
        authorUserId: 'user-admin',
        lang: 'ne',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        303,
        expect.objectContaining({ author: 42 }),
        'ne'
      );
      expect(mockAuditLogs.at(-1)?.details).toMatchObject({ wpAuthorId: 42 });
    });

    it('fails with an actionable error when the publishing account cannot be identified', async () => {
      (getWordPressAuthenticatedUser as any).mockRejectedValueOnce(
        new Error('users/me lookup failed')
      );

      const res = await updatePostAction({
        id: 101,
        title: 'Article Update',
        authorUserId: 'user-unmapped',
        lang: 'en',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/publishing account could not be identified/i);
        expect(res.error).toMatch(/Admin → Users/);
      }
      expect(updateWordPressPost).not.toHaveBeenCalled();
    });

    it('reports missing credentials as an actionable error instead of a silent reassignment', async () => {
      (getWordPressAuthenticatedUser as any).mockRejectedValueOnce(
        new WordPressAuthError('missing credentials')
      );

      const res = await createPostAction({
        title: 'Article Create',
        content: '<p>Body</p>',
        type: 'NEWS',
        authorUserId: 'user-unmapped',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/no WordPress credentials|WP_AUTH_USERNAME/);
      }
      expect(createWordPressPost).not.toHaveBeenCalled();
    });
  });

  // 8. Resource authorId persistence
  describe('8. Resource authorId persistence', () => {
    it('persists selected authorId and createdById in database during resource creation', async () => {
      const res = await createResourceAction({
        title: 'Administrative Law Outline',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        authorUserId: 'user-editor',
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      expect(mockCreatedResource.authorId).toBe('user-editor');
      expect(mockCreatedResource.createdById).toBe('user-admin');
    });

    it('updates authorId during resource update', async () => {
      const res = await updateResourceAction({
        id: 'res-new-1',
        title: 'Administrative Law Outline (Revised)',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        authorUserId: 'user-admin',
      });

      expect(res.success).toBe(true);
      expect(mockUpdatedResource.authorId).toBe('user-admin');
    });
  });

  // 9. Creator and assigned author remaining distinct
  describe('9. Creator and assigned author remaining distinct', () => {
    it('keeps createdById fixed as authenticated actor while authorId is attributed to another', async () => {
      // Actor is user-admin
      const createRes = await createResourceAction({
        title: 'Constitutional Law Summary',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        authorUserId: 'user-editor', // credited author
        status: ContentStatus.PUBLISHED,
      });

      expect(createRes.success).toBe(true);
      expect(mockCreatedResource.createdById).toBe('user-admin');
      expect(mockCreatedResource.authorId).toBe('user-editor');
      expect(mockCreatedResource.createdById).not.toBe(mockCreatedResource.authorId);

      // Actor changes to user-editor for an update
      (auth as any).mockResolvedValue({
        user: { id: 'user-editor', email: 'editor@entertainlawyers.com', role: Role.EDITOR },
      });

      const updateRes = await updateResourceAction({
        id: 'res-new-1',
        title: 'Constitutional Law Summary (Updated)',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        authorUserId: 'user-admin', // reassign public author back to admin
      });

      expect(updateRes.success).toBe(true);
      expect(mockUpdatedResource.authorId).toBe('user-admin');
      // createdById is not modified in updateResource
      expect(mockUpdatedResource.createdById).toBeUndefined();
    });
  });

  // 10. Unauthorized author reassignment
  describe('10. Unauthorized author reassignment', () => {
    it('blocks non-authenticated or regular USER from resource/post actions', async () => {
      (auth as any).mockResolvedValue({
        user: { id: 'user-normal', email: 'student@example.com', role: Role.USER },
      });

      const postRes = await createPostAction({
        title: 'Attempted Post',
        content: 'Content',
        type: 'NEWS',
      });
      expect(postRes.success).toBe(false);
      if (!postRes.success) {
        expect(postRes.error).toMatch(/unauthorized/i);
      }

      const resRes = await createResourceAction({
        title: 'Attempted Resource',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
      });
      expect(resRes.success).toBe(false);
      if (!resRes.success) {
        expect(resRes.error).toMatch(/unauthorized/i);
      }
    });

    it('prevents mapping a WP author to multiple local users', async () => {
      const res = await updateUserAction({
        id: 'user-unmapped',
        wpAuthorIdEn: 24, // Already assigned to user-admin
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/already mapped to Dev Admin/i);
      }
    });
  });

  // 11. Existing resources with null author
  describe('11. Existing resources with null author', () => {
    it('allows updating an existing resource that currently has null authorId without requiring one', async () => {
      const res = await updateResourceAction({
        id: 'res-null-author',
        title: 'Old Resource Updated',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        // authorUserId not passed
      });

      expect(res.success).toBe(true);
      expect(mockUpdatedResource.authorId).toBeUndefined(); // remains unchanged
    });

    it('fallback helper correctly falls back to creator when author is null', () => {
      const resourceWithAuthor = {
        author: { name: 'Assigned Author', email: 'author@example.com' },
        createdBy: { name: 'Original Creator', email: 'creator@example.com' },
      };
      const resourceWithNullAuthor = {
        author: null,
        createdBy: { name: 'Original Creator', email: 'creator@example.com' },
      };
      const resourceWithBothNull = {
        author: null,
        createdBy: null,
      };

      expect((resourceWithAuthor.author ?? resourceWithAuthor.createdBy)?.name).toBe('Assigned Author');
      expect((resourceWithNullAuthor.author ?? resourceWithNullAuthor.createdBy)?.name).toBe('Original Creator');
      expect((resourceWithBothNull.author ?? resourceWithBothNull.createdBy)).toBeNull();
    });
  });

  // 12. Audit logging of actual authenticated actor
  describe('12. Audit logging of actual authenticated actor', () => {
    it('records authenticated actor as userId and assigned author in details', async () => {
      await createPostAction({
        title: 'Audit Log Verification Post',
        content: '<p>Content</p>',
        type: 'OPINION',
        authorUserId: 'user-editor',
      });

      const postAudit = mockAuditLogs.find((l) => l.action === 'CREATE' && l.entityType === 'POST_WP');
      expect(postAudit).toBeDefined();
      expect(postAudit.userId).toBe('user-admin'); // actor
      expect(postAudit.details.authorUserId).toBe('user-editor'); // attributed author
      expect(postAudit.details.authorName).toBe('Staff Editor');
      expect(postAudit.details.wpAuthorId).toBe(30);

      await createResourceAction({
        title: 'Audit Log Verification Resource',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        authorUserId: 'user-editor',
        status: ContentStatus.PUBLISHED,
      });

      const resourceAudit = mockAuditLogs.find((l) => l.action === 'CREATE' && l.entityType === 'RESOURCE');
      expect(resourceAudit).toBeDefined();
      expect(resourceAudit.userId).toBe('user-admin'); // actor
      expect(resourceAudit.details.authorUserId).toBe('user-editor'); // attributed author
    });
  });

  // 13. Draft/publish/archive workflows remaining intact
  describe('13. Draft/publish/archive workflows remaining intact', () => {
    it('creates resource as DRAFT and transitions to PUBLISHED with author preserved', async () => {
      const draftRes = await createResourceAction({
        title: 'Draft Resource Workflow Test',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.DRAFT,
        authorUserId: 'user-editor',
      });

      expect(draftRes.success).toBe(true);
      expect(mockCreatedResource.status).toBe(ContentStatus.DRAFT);
      expect(mockCreatedResource.authorId).toBe('user-editor');

      const publishRes = await updateResourceAction({
        id: 'res-new-1',
        title: 'Draft Resource Workflow Test',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(publishRes.success).toBe(true);
      expect(mockUpdatedResource.status).toBe(ContentStatus.PUBLISHED);
    });
  });

  // 14. Defensive resilience when migration 20261101000000 has not been applied yet
  // 14. Defensive resilience when migration 20261101000000 has not been applied yet
  describe('14. Defensive resilience when migration 20261101000000 has not been applied yet', () => {
    it('listLocalAuthorsWithStatus returns authorMappingAvailable=true when migration is applied', async () => {
      const result = await listLocalAuthorsWithStatus();
      expect(result.authorMappingAvailable).toBe(true);
      expect(result.authors.length).toBeGreaterThan(0);
      expect(result.authors[0].wpAuthorIdEn).toBe(24);
    });

    it('listLocalAuthorsWithStatus gracefully falls back and reports authorMappingAvailable=false when columns are missing (P2022)', async () => {
      const originalFindMany = (prisma.user.findMany as any).getMockImplementation();

      let callCount = 0;
      (prisma.user.findMany as any).mockImplementation(async (query: any) => {
        callCount++;
        if (query?.select?.wpAuthorIdEn !== undefined) {
          throw new Prisma.PrismaClientKnownRequestError('column User.wpAuthorIdEn does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'User.wpAuthorIdEn' },
          });
        }
        return [
          { id: 'user-admin', name: 'Dev Admin', email: 'admin@entertainlawyers.com', role: Role.ADMIN },
          { id: 'user-editor', name: 'Staff Editor', email: 'editor@entertainlawyers.com', role: Role.EDITOR },
        ];
      });

      const result = await listLocalAuthorsWithStatus();
      expect(callCount).toBe(2);
      expect(result.authorMappingAvailable).toBe(false);
      expect(result.authors).toHaveLength(2);
      expect(result.authors[0].id).toBe('user-admin');
      expect(result.authors[0].wpAuthorIdEn).toBeNull();
      expect(result.authors[0].wpAuthorIdNe).toBeNull();
      expect(result.authors[0].authorMappingAvailable).toBe(false);

      (prisma.user.findMany as any).mockImplementation(originalFindMany);
    });

    it('listLocalAuthorsWithStatus re-throws unrelated database failures (does not swallow)', async () => {
      const originalFindMany = (prisma.user.findMany as any).getMockImplementation();

      (prisma.user.findMany as any).mockImplementation(async () => {
        throw new Error('Database connection refused');
      });

      await expect(listLocalAuthorsWithStatus()).rejects.toThrow('Database connection refused');

      (prisma.user.findMany as any).mockImplementation(originalFindMany);
    });

    it('listLocalAuthorsWithStatus re-throws P2022 if caused by an unrelated column', async () => {
      const originalFindMany = (prisma.user.findMany as any).getMockImplementation();

      (prisma.user.findMany as any).mockImplementation(async () => {
        throw new Prisma.PrismaClientKnownRequestError('column User.unrelatedColumn does not exist', {
          code: 'P2022',
          clientVersion: 'test',
          meta: { column: 'User.unrelatedColumn' },
        });
      });

      await expect(listLocalAuthorsWithStatus()).rejects.toThrow(/unrelatedColumn/);

      (prisma.user.findMany as any).mockImplementation(originalFindMany);
    });

    it('resolveLocalAuthor falls back to base fields and sets authorMappingAvailable=false when columns are missing (P2022)', async () => {
      const originalFindUnique = (prisma.user.findUnique as any).getMockImplementation();

      (prisma.user.findUnique as any).mockImplementation(async ({ where, select }: any) => {
        if (select?.wpAuthorIdEn !== undefined) {
          throw new Prisma.PrismaClientKnownRequestError('column User.wpAuthorIdEn does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'User.wpAuthorIdEn' },
          });
        }
        return {
          id: where.id,
          name: 'Dev Admin',
          email: 'admin@entertainlawyers.com',
          role: Role.ADMIN,
        };
      });

      const author = await resolveLocalAuthor('user-admin');
      expect(author.id).toBe('user-admin');
      expect(author.wpAuthorIdEn).toBeNull();
      expect(author.wpAuthorIdNe).toBeNull();
      expect(author.authorMappingAvailable).toBe(false);

      (prisma.user.findUnique as any).mockImplementation(originalFindUnique);
    });

    it('resolveLocalAuthor re-throws unrelated database errors', async () => {
      const originalFindUnique = (prisma.user.findUnique as any).getMockImplementation();

      (prisma.user.findUnique as any).mockImplementation(async () => {
        throw new Error('Connection timeout');
      });

      await expect(resolveLocalAuthor('user-admin')).rejects.toThrow('Connection timeout');

      (prisma.user.findUnique as any).mockImplementation(originalFindUnique);
    });

    it('resolveWordPressAuthor throws actionable error when author mapping migration is unavailable', async () => {
      const originalFindUnique = (prisma.user.findUnique as any).getMockImplementation();

      (prisma.user.findUnique as any).mockImplementation(async ({ where, select }: any) => {
        if (select?.wpAuthorIdEn !== undefined) {
          throw new Prisma.PrismaClientKnownRequestError('column User.wpAuthorIdEn does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'User.wpAuthorIdEn' },
          });
        }
        return {
          id: where.id,
          name: 'Dev Admin',
          email: 'admin@entertainlawyers.com',
          role: Role.ADMIN,
        };
      });

      await expect(resolveWordPressAuthor('user-admin', 'en')).rejects.toThrow(
        /WordPress author assignment is unavailable because database migration 20261101000000 has not been applied yet/
      );

      (prisma.user.findUnique as any).mockImplementation(originalFindUnique);
    });

    it('createResourceAction throws actionable error when author is explicitly assigned and authorId column is missing', async () => {
      const originalCreate = (prisma.resource.create as any).getMockImplementation();

      (prisma.resource.create as any).mockImplementation(async ({ data }: any) => {
        if (data.authorId !== undefined) {
          throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'Resource.authorId' },
          });
        }
        mockCreatedResource = { id: 'res-fallback-1', ...data };
        return mockCreatedResource;
      });

      const result = await createResourceAction({
        title: 'Explicit Author Resource',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        authorUserId: 'user-editor', // explicitly selected
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Author assignment failed because database migration 20261101000000 has not been applied yet/);
      }

      (prisma.resource.create as any).mockImplementation(originalCreate);
    });

    it('createResourceAction falls back to base fields when NO author was explicitly specified and migration is pending', async () => {
      const originalCreate = (prisma.resource.create as any).getMockImplementation();

      let attemptedFullCreate = false;
      let fellBackToBase = false;

      (prisma.resource.create as any).mockImplementation(async ({ data }: any) => {
        if (data.authorId !== undefined) {
          attemptedFullCreate = true;
          throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'Resource.authorId' },
          });
        }
        fellBackToBase = true;
        mockCreatedResource = { id: 'res-fallback-base', ...data };
        return mockCreatedResource;
      });

      const result = await createResourceAction({
        title: 'Default Author Resource',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        // authorUserId is omitted
      });

      expect(attemptedFullCreate).toBe(true);
      expect(fellBackToBase).toBe(true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resourceId).toBe('res-fallback-base');
      }

      (prisma.resource.create as any).mockImplementation(originalCreate);
    });

    it('updateResourceAction throws actionable error when authorUserId is passed and authorId column is missing', async () => {
      const originalUpdate = (prisma.resource.update as any).getMockImplementation();

      (prisma.resource.update as any).mockImplementation(async ({ data }: any) => {
        if (data.authorId !== undefined) {
          throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'Resource.authorId' },
          });
        }
        mockUpdatedResource = { id: 'res-update-1', ...data };
        return mockUpdatedResource;
      });

      const result = await updateResourceAction({
        id: 'res-update-1',
        title: 'Update Resource',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        authorUserId: 'user-admin', // explicitly requested
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Author assignment failed because database migration 20261101000000 has not been applied yet/);
      }

      (prisma.resource.update as any).mockImplementation(originalUpdate);
    });

    it('createResourceAction re-throws unrelated database failures (does not swallow)', async () => {
      const originalCreate = (prisma.resource.create as any).getMockImplementation();

      (prisma.resource.create as any).mockImplementation(async () => {
        throw new Error('Deadlock detected');
      });

      const result = await createResourceAction({
        title: 'Failing Resource',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/An unexpected error occurred|Deadlock detected/);
      }

      (prisma.resource.create as any).mockImplementation(originalCreate);
    });

    it('updateResourceAction falls back to base fields and succeeds when authorUserId is omitted and migration is pending', async () => {
      const originalUpdate = (prisma.resource.update as any).getMockImplementation();
      const updateCalls: any[] = [];

      (prisma.resource.update as any).mockImplementation(async (args: any) => {
        updateCalls.push(args);
        // Simulate missing authorId column on first attempt
        if (updateCalls.length === 1) {
          throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'Resource.authorId' },
          });
        }
        mockUpdatedResource = { id: args.where.id, ...args.data };
        return mockUpdatedResource;
      });

      const result = await updateResourceAction({
        id: 'res-update-fallback-1',
        title: 'Updated Title',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
        // authorUserId is omitted (like form submits when authorMappingAvailable is false)
      });

      expect(result.success).toBe(true);
      expect(updateCalls.length).toBe(2);
      // Both attempts must use explicit minimal select fields
      expect(updateCalls[0].select).toEqual({
        id: true,
        title: true,
        type: true,
        status: true,
      });
      expect(updateCalls[1].select).toEqual({
        id: true,
        title: true,
        type: true,
        status: true,
      });
      // Fallback data must not contain authorId
      expect(updateCalls[1].data.authorId).toBeUndefined();

      (prisma.resource.update as any).mockImplementation(originalUpdate);
    });

    it('createResourceAction explicitly supplies RESOURCE_MUTATION_SELECT on both primary and fallback create queries', async () => {
      const originalCreate = (prisma.resource.create as any).getMockImplementation();
      const createCalls: any[] = [];

      (prisma.resource.create as any).mockImplementation(async (args: any) => {
        createCalls.push(args);
        if (createCalls.length === 1) {
          throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
            code: 'P2022',
            clientVersion: 'test',
            meta: { column: 'Resource.authorId' },
          });
        }
        mockCreatedResource = { id: 'res-new-select-test', ...args.data };
        return mockCreatedResource;
      });

      const result = await createResourceAction({
        title: 'Resource With Minimal Select',
        subjectId: 'a0000000-0000-0000-0000-000000000001',
        type: ResourceType.OTHER,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(result.success).toBe(true);
      expect(createCalls.length).toBe(2);
      // Both attempts must use explicit minimal select fields
      expect(createCalls[0].select).toEqual({
        id: true,
        title: true,
        type: true,
        status: true,
      });
      expect(createCalls[1].select).toEqual({
        id: true,
        title: true,
        type: true,
        status: true,
      });

      (prisma.resource.create as any).mockImplementation(originalCreate);
    });

    describe('AdminResourceForm author assignment regression tests', () => {
      it('create mode: never submits authorUserId when migration is pending', () => {
        const initial = getInitialResourceAuthorId({
          authorMappingAvailable: false,
          isEdit: false,
          defaultAuthorId: 'user-current-admin',
        });
        expect(initial).toBe('');

        // Even if state had a default author id, submitted payload must be undefined
        const submitted = getSubmittedResourceAuthorId({
          authorMappingAvailable: false,
          authorUserId: 'user-current-admin',
        });
        expect(submitted).toBeUndefined();
      });

      it('edit mode: never submits authorUserId when migration is pending', () => {
        const initial = getInitialResourceAuthorId({
          authorMappingAvailable: false,
          resourceAuthorId: 'user-author-existing',
          isEdit: true,
          defaultAuthorId: 'user-current-admin',
        });
        expect(initial).toBe('');

        const submitted = getSubmittedResourceAuthorId({
          authorMappingAvailable: false,
          authorUserId: 'user-author-existing',
        });
        expect(submitted).toBeUndefined();
      });

      it('create mode: keeps normal default-author selection when mapping is available', () => {
        const initial = getInitialResourceAuthorId({
          authorMappingAvailable: true,
          isEdit: false,
          defaultAuthorId: 'user-current-admin',
        });
        expect(initial).toBe('user-current-admin');

        const submitted = getSubmittedResourceAuthorId({
          authorMappingAvailable: true,
          authorUserId: initial,
        });
        expect(submitted).toBe('user-current-admin');
      });

      it('edit mode: preserves existing author attribution during normal edits', () => {
        const initial = getInitialResourceAuthorId({
          authorMappingAvailable: true,
          resourceAuthorId: 'user-author-original',
          isEdit: true,
          defaultAuthorId: 'user-current-admin',
        });
        expect(initial).toBe('user-author-original');

        const submitted = getSubmittedResourceAuthorId({
          authorMappingAvailable: true,
          authorUserId: initial,
        });
        expect(submitted).toBe('user-author-original');
      });

      it('edit mode: preserves unassigned author attribution during normal edits', () => {
        const initial = getInitialResourceAuthorId({
          authorMappingAvailable: true,
          resourceAuthorId: null,
          isEdit: true,
          defaultAuthorId: 'user-current-admin',
        });
        expect(initial).toBe('');

        const submitted = getSubmittedResourceAuthorId({
          authorMappingAvailable: true,
          authorUserId: initial,
        });
        expect(submitted).toBeUndefined();
      });
    });
  });

  // 8. Real error propagation through fetchWordPress
  //
  // The tests above stub getWordPressAuthenticatedUser directly. These run the
  // genuine resolver: real getWordPressAuthHeader -> real fetchWordPress ->
  // stubbed global fetch. That is the layer where a WordPressAuthError used to
  // be wrapped into a generic WordPressApiError.
  describe('8. Real fetchWordPress authentication error propagation', () => {
    const WP_ENV_KEYS = [
      'WP_AUTH_HEADER',
      'WP_AUTH_USERNAME',
      'WP_AUTH_APP_PASSWORD',
      'WP_NEPALI_AUTH_HEADER',
      'WP_NEPALI_AUTH_USERNAME',
      'WP_NEPALI_AUTH_APP_PASSWORD',
    ] as const;
    const fetchMock = vi.fn();
    let savedEnv: Record<string, string | undefined>;

    const basic = (username: string, password: string) =>
      `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const jsonResponse = (
      body: unknown,
      init: { ok?: boolean; status?: number; statusText?: string } = {}
    ) => ({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      statusText: init.statusText ?? 'OK',
      json: async () => body,
      headers: { get: () => null },
    });

    beforeEach(() => {
      savedEnv = {};
      for (const key of WP_ENV_KEYS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
      fetchMock.mockReset();
      vi.stubGlobal('fetch', fetchMock);
      // Swap the stub for the real resolver. Write calls stay mocked.
      (getWordPressAuthenticatedUser as any).mockImplementation(
        actualWordPress.getWordPressAuthenticatedUser
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      for (const key of WP_ENV_KEYS) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
      }
    });

    it('preserves WordPressAuthError when English credentials are missing', async () => {
      const error = await actualWordPress.getWordPressAuthenticatedUser('en').catch((e) => e);

      expect(error).toBeInstanceOf(WordPressAuthError);
      expect(error).not.toBeInstanceOf(actualWordPress.WordPressApiError);
      expect(error.message).toMatch(/WP_AUTH_HEADER/);
      expect(error.message).toMatch(/WP_AUTH_USERNAME/);
      expect(error.message).toMatch(/WP_AUTH_APP_PASSWORD/);
      expect(error.message).not.toMatch(/WP_NEPALI_/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('preserves WordPressAuthError when Nepali credentials are missing', async () => {
      const error = await actualWordPress.getWordPressAuthenticatedUser('ne').catch((e) => e);

      expect(error).toBeInstanceOf(WordPressAuthError);
      expect(error).not.toBeInstanceOf(actualWordPress.WordPressApiError);
      expect(error.message).toMatch(/WP_NEPALI_AUTH_HEADER/);
      expect(error.message).toMatch(/WP_NEPALI_AUTH_USERNAME/);
      expect(error.message).toMatch(/WP_NEPALI_AUTH_APP_PASSWORD/);
      expect(error.message).not.toMatch(/WP_AUTH_HEADER|WP_AUTH_USERNAME|WP_AUTH_APP_PASSWORD/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('never uses English credentials as a Nepali fallback', async () => {
      process.env.WP_AUTH_HEADER = basic('english-user', 'english-pass');

      const error = await actualWordPress.getWordPressAuthenticatedUser('ne').catch((e) => e);

      expect(error).toBeInstanceOf(WordPressAuthError);
      expect(error.message).toMatch(/WP_NEPALI_AUTH_HEADER/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('resolves each install with its own credentials and endpoint', async () => {
      process.env.WP_AUTH_HEADER = basic('english-user', 'english-pass');
      process.env.WP_NEPALI_AUTH_HEADER = basic('nepali-user', 'nepali-pass');
      fetchMock
        .mockResolvedValueOnce(jsonResponse([{ id: 501, name: 'English Publisher' }]))
        .mockResolvedValueOnce(jsonResponse([{ id: 602, name: 'Nepali Publisher' }]));

      const english = await actualWordPress.getWordPressAuthenticatedUser('en');
      const nepali = await actualWordPress.getWordPressAuthenticatedUser('ne');

      expect(english.id).toBe(501);
      expect(nepali.id).toBe(602);

      const [enUrl, enInit] = fetchMock.mock.calls[0];
      const [neUrl, neInit] = fetchMock.mock.calls[1];
      expect(String(enUrl)).not.toContain('/nepali/');
      expect(String(enUrl)).toContain('/users/me');
      expect((enInit.headers as Record<string, string>).Authorization).toBe(
        basic('english-user', 'english-pass')
      );
      expect(String(neUrl)).toContain('/nepali/');
      expect(String(neUrl)).toContain('/users/me');
      expect((neInit.headers as Record<string, string>).Authorization).toBe(
        basic('nepali-user', 'nepali-pass')
      );
    });

    it.each([
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
    ])('preserves HTTP %i as an authentication API error', async (status, statusText) => {
      process.env.WP_AUTH_USERNAME = 'english-user';
      process.env.WP_AUTH_APP_PASSWORD = 'english-pass';
      fetchMock.mockResolvedValue(
        jsonResponse(
          { code: 'rest_forbidden', message: 'Sorry, you are not allowed to do that.' },
          { ok: false, status, statusText }
        )
      );

      const error = await actualWordPress.getWordPressAuthenticatedUser('en').catch((e) => e);

      expect(error).toBeInstanceOf(actualWordPress.WordPressApiError);
      expect(error).not.toBeInstanceOf(WordPressAuthError);
      expect(error.status).toBe(status);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['an empty array', []],
      ['a zero id', [{ id: 0, name: 'Nope' }]],
      ['a non-numeric id', [{ id: '501', name: 'Nope' }]],
    ])('rejects %s from /users/me with a clear error', async (_label, body) => {
      process.env.WP_AUTH_HEADER = basic('english-user', 'english-pass');
      fetchMock.mockResolvedValue(jsonResponse(body));

      const error = await actualWordPress.getWordPressAuthenticatedUser('en').catch((e) => e);

      expect(error).toBeInstanceOf(actualWordPress.WordPressApiError);
      expect(error).not.toBeInstanceOf(WordPressAuthError);
      expect(error.status).toBe(502);
      expect(error.message).toMatch(/valid id/i);
    });

    it('createPostAction returns English credential instructions and never writes', async () => {
      const res = await createPostAction({
        title: 'Article with unresolvable author',
        content: '<p>Body</p>',
        type: 'OPINION',
        authorUserId: 'user-unmapped',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/WP_AUTH_HEADER/);
        expect(res.error).toMatch(/WP_AUTH_USERNAME/);
        expect(res.error).toMatch(/WP_AUTH_APP_PASSWORD/);
        expect(res.error).toMatch(/Admin → Users/);
        expect(res.error).not.toMatch(/WP_NEPALI_/);
      }
      expect(createWordPressPost).not.toHaveBeenCalled();
    });

    it('updatePostAction returns Nepali credential instructions and never writes', async () => {
      const res = await updatePostAction({
        id: 303,
        title: 'नेपाली लेख',
        authorUserId: 'user-unmapped',
        lang: 'ne',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/WP_NEPALI_AUTH_HEADER/);
        expect(res.error).toMatch(/WP_NEPALI_AUTH_USERNAME/);
        expect(res.error).toMatch(/WP_NEPALI_AUTH_APP_PASSWORD/);
        expect(res.error).not.toMatch(/WP_AUTH_HEADER|WP_AUTH_USERNAME|WP_AUTH_APP_PASSWORD/);
      }
      expect(updateWordPressPost).not.toHaveBeenCalled();
    });

    it('updatePostAction keeps a 401 actionable and never writes', async () => {
      process.env.WP_AUTH_USERNAME = 'english-user';
      process.env.WP_AUTH_APP_PASSWORD = 'wrong-password';
      fetchMock.mockResolvedValue(
        jsonResponse(
          { code: 'rest_forbidden' },
          { ok: false, status: 401, statusText: 'Unauthorized' }
        )
      );

      const res = await updatePostAction({
        id: 101,
        title: 'Article with rejected credentials',
        authorUserId: 'user-unmapped',
        lang: 'en',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/rejected the server credentials \(HTTP 401\)/);
        expect(res.error).toMatch(/Admin → Users/);
      }
      expect(updateWordPressPost).not.toHaveBeenCalled();
    });

    it('createPostAction reports an invalid identity response and never writes', async () => {
      process.env.WP_AUTH_HEADER = basic('english-user', 'english-pass');
      fetchMock.mockResolvedValue(jsonResponse([{ id: 0, name: 'Bad payload' }]));

      const res = await createPostAction({
        title: 'Article with invalid identity',
        content: '<p>Body</p>',
        type: 'NEWS',
        authorUserId: 'user-unmapped',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/could not be identified \(HTTP 502\)/);
        expect(res.error).toMatch(/Admin → Users/);
      }
      expect(createWordPressPost).not.toHaveBeenCalled();
    });

    it('keeps a mapped author working without resolving /users/me', async () => {
      const res = await updatePostAction({
        id: 303,
        title: 'म्याप गरिएको लेखक',
        authorUserId: 'user-admin',
        lang: 'ne',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        303,
        expect.objectContaining({ author: 42 }),
        'ne'
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not resolve an identity or send an author when none is selected', async () => {
      const res = await updatePostAction({
        id: 101,
        title: 'No author reassignment',
        lang: 'en',
      });

      expect(res.success).toBe(true);
      expect(updateWordPressPost).toHaveBeenCalledWith(
        101,
        expect.not.objectContaining({ author: expect.anything() }),
        'en'
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
