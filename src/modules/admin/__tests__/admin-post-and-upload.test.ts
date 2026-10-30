import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Role } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        role: where.id === 'admin-1' ? Role.ADMIN : where.id === 'editor-1' ? Role.EDITOR : Role.USER,
      })),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  },
}));

// Mock wordpress
vi.mock('@/lib/wordpress', () => ({
  createWordPressPost: vi.fn().mockImplementation(async (input, lang) => ({
    id: 9999,
    title: { rendered: input.title },
    content: { rendered: input.content },
    status: input.status,
    categories: input.categories,
    lang,
  })),
  updateWordPressPost: vi.fn().mockImplementation(async (id, input, lang) => ({
    id,
    title: { rendered: input.title || 'Updated Title' },
    content: { rendered: input.content || 'Updated Content' },
    status: input.status,
    categories: input.categories,
    lang,
  })),
  deleteWordPressPost: vi.fn().mockImplementation(async (id, force, lang) => ({
    deleted: true,
    id,
    force,
    lang,
  })),
  mapTypeToCategory: vi.fn().mockImplementation((type: string, lang: 'en' | 'ne') => {
    if (lang === 'ne') {
      const map: Record<string, number> = {
        NEPALI_SAMANYA_SAMACHAR: 58,
        NEPALI_ADALAT_SAMACHAR: 56,
        NEPALI_MUKHYA_SAMACHAR: 58,
        NEPALI_NAJIRHARU: 57,
        NEPALI_AIN_KANUN: 64,
        NEPALI_BLOG_BICHAR: 61,
      };
      return [map[type] || 58];
    }
    const map: Record<string, number> = {
      NEWS: 58,
      BLOG: 61,
      OPINION: 60,
      FACT: 78,
      PERSONALITY: 81,
    };
    return [map[type] || 58];
  }),
  mapCategoryToType: vi.fn().mockImplementation((categories: number[], lang: 'en' | 'ne') => {
    if (lang === 'ne') {
      if (categories.includes(56)) return 'NEPALI_ADALAT_SAMACHAR';
      if (categories.includes(57)) return 'NEPALI_NAJIRHARU';
      if (categories.includes(64)) return 'NEPALI_AIN_KANUN';
      if (categories.includes(61)) return 'NEPALI_BLOG_BICHAR';
      return 'NEPALI_SAMANYA_SAMACHAR';
    }
    if (categories.includes(60)) return 'OPINION';
    if (categories.includes(61)) return 'BLOG';
    if (categories.includes(78)) return 'FACT';
    if (categories.includes(81)) return 'PERSONALITY';
    return 'NEWS';
  }),
}));

import {
  createPostAction,
  updatePostAction,
  deletePostAction,
  bulkUpdatePostStatusAction,
} from '../admin-post.actions';
import { initiateMediaUploadAction } from '../admin-media.actions';

describe('Admin Post Features & Media Upload Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.WP_READ_ONLY;

    (auth as any).mockResolvedValue({
      user: { id: 'admin-1', role: Role.ADMIN, email: 'admin@entertainlawyers.com' },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Media Upload Verification', () => {
    it('successfully initiates media upload for all supported entity types', async () => {
      const types = ['POST', 'RICH_TEXT', 'EVENT', 'GALLERY', 'PUBLICATION', 'TEAM', 'PROFILE'] as const;

      for (const type of types) {
        const res = await initiateMediaUploadAction({
          filename: `test-${type.toLowerCase()}.png`,
          mimeType: 'image/png',
          size: 1024 * 100, // 100KB
          type,
        });

        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.uploadUrl).toBeDefined();
          expect(res.data.key).toContain(`editorial/`);
          expect(res.data.publicUrl).toBeDefined();
        }
      }
    });

    it('rejects uploads exceeding 10MB limit', async () => {
      const res = await initiateMediaUploadAction({
        filename: 'large.jpg',
        mimeType: 'image/jpeg',
        size: 12 * 1024 * 1024, // 12MB
        type: 'POST',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/under 10MB/i);
      }
    });

    it('blocks upload initiation when user is not ADMIN or EDITOR', async () => {
      (auth as any).mockResolvedValue({
        user: { id: 'user-normal', role: Role.USER, email: 'user@example.com' },
      });

      const res = await initiateMediaUploadAction({
        filename: 'avatar.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        type: 'PROFILE',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
    });
  });

  describe('Post Creation (createPostAction)', () => {
    it('creates an English blog post with correct category', async () => {
      const res = await createPostAction({
        title: 'Understanding Corporate Law in Nepal',
        content: '<p>Comprehensive analysis of company registration and governance.</p>',
        type: 'BLOG',
        isPublished: true,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('9999');
      }
    });

    it('creates an English opinion post with OPINION category', async () => {
      const res = await createPostAction({
        title: 'Editorial: Legal Reforms for Foreign Investment',
        content: '<p>Expert opinion on FDI regulatory frameworks.</p>',
        type: 'OPINION',
        isPublished: true,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('9999');
      }
    });

    it('creates a Nepali court news post with correct Nepali category', async () => {
      const res = await createPostAction({
        title: 'सर्वोच्च अदालतको पछिल्लो महत्वपूर्ण फैसला',
        content: '<p>फैसलाको विस्तृत विवरण र नजिर सम्बन्धी जानकारी।</p>',
        type: 'NEPALI_ADALAT_SAMACHAR',
        isPublished: false,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('9999');
      }
    });

    it('rejects post creation with missing or empty title/content', async () => {
      const res = await createPostAction({
        title: '',
        content: '<p>Some content</p>',
        type: 'NEWS',
      });

      expect(res.success).toBe(false);
    });
  });

  describe('Post Editing (updatePostAction)', () => {
    it('updates post title and content successfully', async () => {
      const res = await updatePostAction({
        id: 9999,
        title: 'Updated Post Title',
        content: '<p>Updated paragraph content with revised citations.</p>',
        type: 'NEWS',
        isPublished: true,
      });

      expect(res.success).toBe(true);
    });

    it('updates post status to draft without changing content', async () => {
      const res = await updatePostAction({
        id: 9999,
        isPublished: false,
        lang: 'en',
      });

      expect(res.success).toBe(true);
    });
  });

  describe('Post Deletion (deletePostAction)', () => {
    it('deletes post and invalidates cache', async () => {
      const res = await deletePostAction({
        id: 9999,
        lang: 'en',
      });

      expect(res.success).toBe(true);
    });
  });

  describe('Bulk Post Operations (bulkUpdatePostStatusAction)', () => {
    it('bulk publishes multiple posts', async () => {
      const res = await bulkUpdatePostStatusAction({
        ids: [101, 102, 103],
        lang: 'en',
        action: 'PUBLISH',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.succeeded).toBe(3);
        expect(res.data.failed).toBe(0);
      }
    });

    it('bulk trashes multiple posts', async () => {
      const res = await bulkUpdatePostStatusAction({
        ids: [201, 202],
        lang: 'ne',
        action: 'TRASH',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.succeeded).toBe(2);
        expect(res.data.failed).toBe(0);
      }
    });

    it('bulk permanently deletes multiple posts', async () => {
      const res = await bulkUpdatePostStatusAction({
        ids: [301],
        lang: 'en',
        action: 'DELETE_PERMANENTLY',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.succeeded).toBe(1);
        expect(res.data.failed).toBe(0);
      }
    });
  });
});
