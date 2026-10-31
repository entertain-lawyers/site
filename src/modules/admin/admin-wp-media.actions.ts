'use server';

import { z } from 'zod';
import { Role } from '@prisma/client';
import { createSafeAction, UserFacingError } from '@/lib/safe-action';
import { listWordPressMedia, WordPressApiError, WordPressAuthError } from '@/lib/wordpress';
import { toWordPressMediaItem, type WordPressMediaItem } from '@/lib/wordpress-media';

const listMediaSchema = z.object({
  lang: z.enum(['en', 'ne']),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  search: z.string().trim().max(100).optional(),
});

export type WordPressMediaPage = {
  items: WordPressMediaItem[];
  page: number;
  totalPages: number;
  total: number;
};

/**
 * One page of images from the English or Nepali Media Library for the
 * featured-image picker. The request runs here, with the server's credentials;
 * the browser only receives image URLs and labels.
 */
export const listWordPressMediaAction = createSafeAction(
  async (rawArgs: z.input<typeof listMediaSchema>, session): Promise<WordPressMediaPage> => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

    const parsed = listMediaSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(`Invalid input: ${parsed.error.issues[0]?.message || 'media query'}`);
    }
    const { lang, page, search } = parsed.data;

    try {
      const result = await listWordPressMedia({ lang, page, search, perPage: 24 });
      return {
        items: result.data.map(toWordPressMediaItem),
        page,
        totalPages: Math.max(result.totalPages, 1),
        total: result.total,
      };
    } catch (error) {
      if (error instanceof WordPressAuthError) {
        throw new UserFacingError('The Media Library is unavailable: this server has no WordPress credentials.');
      }
      if (error instanceof WordPressApiError) {
        // WordPress answers 400 for a page past the end (e.g. after a search shrank the results).
        if (error.status === 400) return { items: [], page, totalPages: 1, total: 0 };
        if (error.status === 401 || error.status === 403) {
          throw new UserFacingError(`WordPress refused to list media (HTTP ${error.status}). Check the API user's permissions and application password.`);
        }
      }
      throw new UserFacingError('The WordPress Media Library could not be loaded. Try again in a moment.');
    }
  },
  { requireAuth: true }
);
