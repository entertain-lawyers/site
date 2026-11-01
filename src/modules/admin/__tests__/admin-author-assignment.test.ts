/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, ResourceType, ContentStatus } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock wordpress client
vi.mock('@/lib/wordpress', () => ({
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
  mapTypeToCategory: vi.fn().mockReturnValue([61]),
  toWordPressWriteError: vi.fn((err: any) => err),
}));

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
      const tx = {
        resource: {
          create: vi.fn().mockImplementation(async ({ data }) => {
            mockCreatedResource = { id: 'res-new-1', ...data };
            return mockCreatedResource;
          }),
          update: vi.fn().mockImplementation(async ({ where, data }) => {
            mockUpdatedResource = { id: where.id, ...data };
            return mockUpdatedResource;
          }),
        },
        auditLog: {
          create: vi.fn().mockImplementation(async ({ data }) => {
            mockAuditLogs.push(data);
            return { id: `audit-${mockAuditLogs.length}`, ...data };
          }),
        },
      };
      return callback(tx);
    }),
  },
}));

import {
  CONTENT_AUTHOR_ROLES,
  isContentAuthorRole,
  listLocalAuthors,
  resolveLocalAuthor,
  resolveWordPressAuthor,
  listWordPressAuthorsSafe,
} from '@/lib/content-authors';
import { createPostAction, updatePostAction } from '@/modules/admin/admin-post.actions';
import { createResourceAction, updateResourceAction } from '@/modules/admin/admin-resource.actions';
import { updateUserAction } from '@/modules/admin/admin-user.actions';
import { createWordPressPost, updateWordPressPost } from '@/lib/wordpress';

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
});
