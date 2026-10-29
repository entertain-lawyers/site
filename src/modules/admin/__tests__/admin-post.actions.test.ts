import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Role } from '@prisma/client';

// Mock safe-action FIRST before importing actions
vi.mock('@/lib/safe-action', () => ({
  createSafeAction: (fn: any) => async (args: any) => {
    try {
      const result = await fn(args, { role: Role.ADMIN, userId: 'user-1' });
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { create: vi.fn() }
  }
}));

vi.mock('@/lib/wordpress', () => ({
  createWordPressPost: vi.fn().mockResolvedValue({ id: 1, title: { rendered: 'Test' } }),
  updateWordPressPost: vi.fn().mockResolvedValue({ id: 1, title: { rendered: 'Test' } }),
  deleteWordPressPost: vi.fn().mockResolvedValue({ deleted: true }),
  mapTypeToCategory: vi.fn().mockReturnValue([1]),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Use dynamic import for the actions to ensure mocks are applied first
const getActions = async () => import('../admin-post.actions');

describe('admin-post.actions.ts Preview Safety', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should block createPostAction in Preview Mode', async () => {
    process.env.VERCEL_ENV = 'preview';
    const { createPostAction } = await getActions();
    
    const result = await createPostAction({
      title: 'Test',
      content: 'Content',
      type: 'NEWS'
    });

    if (!result?.success) {
      expect(result?.error).toBe('Cannot perform write operations in Preview mode to protect production WordPress.');
    } else {
      expect.fail('Action should have failed');
    }
  });

  it('should block updatePostAction in Preview Mode', async () => {
    process.env.VERCEL_ENV = 'preview';
    const { updatePostAction } = await getActions();
    
    const result = await updatePostAction({
      id: 1,
      title: 'Test Updated',
    });

    if (!result?.success) {
      expect(result?.error).toBe('Cannot perform write operations in Preview mode to protect production WordPress.');
    } else {
      expect.fail('Action should have failed');
    }
  });

  it('should block deletePostAction in Preview Mode', async () => {
    process.env.VERCEL_ENV = 'preview';
    const { deletePostAction } = await getActions();
    
    const result = await deletePostAction({
      id: 1,
    });

    if (!result?.success) {
      expect(result?.error).toBe('Cannot perform write operations in Preview mode to protect production WordPress.');
    } else {
      expect.fail('Action should have failed');
    }
  });

  it('should allow createPostAction in normal environments', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.WP_READ_ONLY = 'false';
    const { createPostAction } = await getActions();
    
    const result = await createPostAction({
      title: 'Test',
      content: 'Content',
      type: 'NEWS'
    });

    expect(result?.success).toBe(true);
  });

  it('should keep the supplied categories when the type is unchanged', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.WP_READ_ONLY = 'false';
    const { updatePostAction } = await getActions();
    const { updateWordPressPost } = await import('@/lib/wordpress');

    const result = await updatePostAction({
      id: 7,
      title: 'Edited title',
      content: 'Edited content',
      lang: 'ne',
      categories: [60],
    });

    expect(result?.success).toBe(true);
    expect(updateWordPressPost).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ categories: [60] }),
      'ne'
    );
  });
});
