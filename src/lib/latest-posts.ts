import {
  getWordPressPosts,
  mapCategoryToType,
} from '@/lib/wordpress';
import type { LatestPost } from '@/components/posts/LatestPostsSidebar';

import { cache } from 'react';

/**
 * Latest published WordPress posts across the English content types
 * (NEWS, BLOG, FACT, PERSONALITY), newest first, for sidebar rails.
 *
 * Reuses the existing getWordPressPosts fetch integration (cached by
 * Next.js) — requesting only the lightweight fields needed for sidebar display.
 */
export const getLatestPosts = cache(async (excludeId?: number, limit = 6, lang: 'en' = 'en'): Promise<LatestPost[]> => {
  const response = await getWordPressPosts({
    status: 'publish',
    lang,
    perPage: 24,
    orderBy: 'date',
    order: 'desc',
    embed: true,
    fields: 'id,date,slug,title,categories,_links,_embedded',
  });

  const items: LatestPost[] = response.data
    .filter(p => p.id !== excludeId)
    .flatMap(p => {
      const type = mapCategoryToType(p.categories, lang);
      const idStr = String(p.id);
      const url =
        type === 'NEWS'
          ? `/news/${idStr}`
          : type === 'BLOG'
            ? `/blogs/${idStr}`
            : type === 'FACT' || type === 'PERSONALITY'
              ? `/historical-facts/${idStr}`
              : null;

      // Drop posts whose route is not part of this site (e.g. UNKNOWN).
      if (!url) return [];

      return [{
        id: idStr,
        title: p.title.rendered,
        type,
        createdAt: new Date(p.date),
        featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        url,
      }];
    });

  return items.slice(0, limit);
});

/**
 * Latest published news posts specifically for sidebar rails.
 * Used on prescribed cases and legal updates.
 */
export const getLatestNewsPosts = cache(async (excludeId?: number, limit = 5, lang: 'en' = 'en'): Promise<LatestPost[]> => {
  try {
    const all = await getLatestPosts(excludeId, 24, lang);
    const newsOnly = all.filter((p) => p.type === 'NEWS');
    if (newsOnly.length >= limit) {
      return newsOnly.slice(0, limit);
    }
    // Fill remaining with freshest posts if fewer than limit news posts
    const others = all.filter((p) => p.type !== 'NEWS');
    return [...newsOnly, ...others].slice(0, limit);
  } catch (error) {
    console.error('[getLatestNewsPosts] Failed to fetch latest news posts:', error);
    return [];
  }
});
