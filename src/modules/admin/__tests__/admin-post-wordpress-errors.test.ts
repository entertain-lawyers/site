import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => ({ role: Role.ADMIN })) },
    auditLog: { create: vi.fn() },
  },
}));
// Keep the real error classes and category mapping; only the network writes are faked.
vi.mock('@/lib/wordpress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wordpress')>()),
  createWordPressPost: vi.fn(),
  updateWordPressPost: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { createWordPressPost, updateWordPressPost, WordPressApiError, WordPressAuthError } from '@/lib/wordpress';
import { createPostAction, updatePostAction } from '../admin-post.actions';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;
const draft = { title: 'ABC', content: '<p>123</p>', type: 'NEWS' as const, isPublished: true };

describe('post actions: WordPress write failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock(auth).mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } });
  });

  it('says which settings are missing when the server has no WordPress credentials', async () => {
    mock(createWordPressPost).mockRejectedValue(new WordPressAuthError());

    const res = await createPostAction(draft);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/no WordPress credentials/);
      expect(res.error).toMatch(/WP_AUTH_USERNAME and WP_AUTH_APP_PASSWORD/);
    }
  });

  it('reports a credential WordPress rejects separately from a missing one', async () => {
    mock(updateWordPressPost).mockRejectedValue(
      new WordPressApiError('Failed to update WordPress post: Unauthorized', 401, '/posts/5982')
    );

    const res = await updatePostAction({ id: 5982, ...draft });

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/rejected the server credentials \(HTTP 401\)/);
  });

  it('keeps other WordPress failures as they were', async () => {
    mock(createWordPressPost).mockRejectedValue(new WordPressApiError('Failed to create WordPress post: Bad Gateway', 502));

    const res = await createPostAction(draft);

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe('WordPress API Error: Failed to create WordPress post: Bad Gateway');
  });
});
