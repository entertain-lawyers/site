import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));
// Real error classes and mapping helpers; only the network calls are faked.
vi.mock('@/lib/wordpress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wordpress')>()),
  listWordPressMedia: vi.fn(),
  createWordPressPost: vi.fn(),
  updateWordPressPost: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createWordPressPost,
  listWordPressMedia,
  updateWordPressPost,
  WordPressApiError,
  WordPressAuthError,
} from '@/lib/wordpress';
import { listWordPressMediaAction } from '../admin-wp-media.actions';
import { createPostAction, updatePostAction } from '../admin-post.actions';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;

const wpMedia = (id: number) => ({
  id,
  date: '2026-10-31T10:00:00',
  slug: `image-${id}`,
  link: '',
  title: { rendered: `Image ${id}` },
  author: 1,
  source_url: `https://www.entertainlawyers.com/wp-content/uploads/2026/10/image-${id}.jpg`,
  mime_type: 'image/jpeg',
  media_details: { width: 1200, height: 630, file: `2026/10/image-${id}.jpg`, sizes: {} },
});

const wpPost = { id: 5982, title: { rendered: 'Post' } };

function signInAs(role: Role) {
  mock(auth).mockResolvedValue({ user: { id: 'user-1', role } });
  mock(prisma.user.findUnique).mockResolvedValue({ role });
}

describe('listWordPressMediaAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(Role.EDITOR);
  });

  it('is limited to admins and editors', async () => {
    signInAs(Role.USER);
    const res = await listWordPressMediaAction({ lang: 'en' });
    expect(res.success).toBe(false);
    expect(listWordPressMedia).not.toHaveBeenCalled();
  });

  it('returns one page of browser-safe items for the requested library', async () => {
    mock(listWordPressMedia).mockResolvedValue({ data: [wpMedia(1), wpMedia(2)], total: 26, totalPages: 2, page: 2, perPage: 24 });

    const res = await listWordPressMediaAction({ lang: 'ne', page: 2, search: '  court ' });

    expect(listWordPressMedia).toHaveBeenCalledWith({ lang: 'ne', page: 2, search: 'court', perPage: 24 });
    expect(res).toEqual({
      success: true,
      data: {
        page: 2,
        total: 26,
        totalPages: 2,
        items: [
          expect.objectContaining({ id: 1, filename: 'image-1.jpg', url: wpMedia(1).source_url }),
          expect.objectContaining({ id: 2, filename: 'image-2.jpg' }),
        ],
      },
    });
  });

  it('rejects an unknown language', async () => {
    const res = await listWordPressMediaAction({ lang: 'fr' as 'en' });
    expect(res.success).toBe(false);
    expect(listWordPressMedia).not.toHaveBeenCalled();
  });

  it('treats a page past the end as empty and reports real failures', async () => {
    mock(listWordPressMedia).mockRejectedValueOnce(new WordPressApiError('bad page', 400, '/media'));
    expect(await listWordPressMediaAction({ lang: 'en', page: 9 })).toEqual({
      success: true,
      data: { items: [], page: 9, totalPages: 1, total: 0 },
    });

    mock(listWordPressMedia).mockRejectedValueOnce(new WordPressApiError('forbidden', 403, '/media'));
    let res = await listWordPressMediaAction({ lang: 'en' });
    expect(res.success === false && res.error).toMatch(/refused to list media \(HTTP 403\)/);

    mock(listWordPressMedia).mockRejectedValueOnce(new WordPressAuthError());
    res = await listWordPressMediaAction({ lang: 'en' });
    expect(res.success === false && res.error).toMatch(/no WordPress credentials/);

    mock(listWordPressMedia).mockRejectedValueOnce(new WordPressApiError('timed out', undefined, '/media'));
    res = await listWordPressMediaAction({ lang: 'en' });
    expect(res.success === false && res.error).toMatch(/could not be loaded/);
  });
});

describe('featured image persistence through featured_media', () => {
  const base = { title: 'ABC', content: '<p>123</p>', isPublished: true };

  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(Role.ADMIN);
    delete process.env.VERCEL_ENV;
    delete process.env.WP_READ_ONLY;
    mock(createWordPressPost).mockResolvedValue(wpPost);
    mock(updateWordPressPost).mockResolvedValue(wpPost);
  });

  it('sets featured_media when a new post is created with an image', async () => {
    await createPostAction({ ...base, type: 'NEPALI_SAMANYA_SAMACHAR', featuredMediaId: 77 });
    expect(createWordPressPost).toHaveBeenCalledWith(expect.objectContaining({ featured_media: 77 }), 'ne');
  });

  it('creates a post without featured_media when none was chosen', async () => {
    await createPostAction({ ...base, type: 'NEWS' });
    expect(mock(createWordPressPost).mock.calls[0][0]).not.toHaveProperty('featured_media');
  });

  it('replaces and removes the featured image of an existing post', async () => {
    await updatePostAction({ id: 5982, ...base, lang: 'en', featuredMediaId: 88 });
    expect(updateWordPressPost).toHaveBeenLastCalledWith(5982, expect.objectContaining({ featured_media: 88 }), 'en');

    await updatePostAction({ id: 5982, ...base, lang: 'en', featuredMediaId: 0 });
    expect(updateWordPressPost).toHaveBeenLastCalledWith(5982, expect.objectContaining({ featured_media: 0 }), 'en');
  });

  it('leaves the featured image alone when the editor did not change it', async () => {
    await updatePostAction({ id: 5982, ...base, lang: 'en' });
    expect(mock(updateWordPressPost).mock.calls[0][1]).not.toHaveProperty('featured_media');
  });

  it('rejects negative media ids and passes on WordPress\'s message for an invalid one', async () => {
    const bad = await updatePostAction({ id: 5982, ...base, lang: 'en', featuredMediaId: -1 });
    expect(bad.success).toBe(false);
    expect(updateWordPressPost).not.toHaveBeenCalled();

    mock(updateWordPressPost).mockRejectedValueOnce(
      new WordPressApiError('Bad Request', 400, '/posts/5982', { code: 'rest_invalid_featured_media', message: 'Invalid featured media ID.' })
    );
    const res = await updatePostAction({ id: 5982, ...base, lang: 'en', featuredMediaId: 123456 });
    expect(res.success === false && res.error).toBe('WordPress API Error: Invalid featured media ID.');
  });

  it('keeps the Preview write protection for featured image changes', async () => {
    process.env.VERCEL_ENV = 'preview';
    const res = await updatePostAction({ id: 5982, ...base, lang: 'en', featuredMediaId: 88 });
    expect(res.success).toBe(false);
    expect(updateWordPressPost).not.toHaveBeenCalled();
    delete process.env.VERCEL_ENV;
  });
});
