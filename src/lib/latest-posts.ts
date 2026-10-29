import {
  getWordPressPosts,
  mapCategoryToType,
} from '@/lib/wordpress';
import type { LatestPost } from '@/components/posts/LatestPostsSidebar';

/**
 * Latest published WordPress posts across the English content types
 * (NEWS, BLOG, FACT, PERSONALITY), newest first, for sidebar rails.
 *
 * Reuses the existing getWordPressPosts fetch integration (cached by
 * Next.js) — one extra request per detail page render, no duplicates.
 */
export async function getLatestPosts(excludeId?: number, limit = 6, lang: 'en' = 'en'): Promise<LatestPost[]> {
  const response = await getWordPressPosts({
    status: 'publish',
    lang,
    perPage: 24,
    orderBy: 'date',
    order: 'desc',
    embed: true
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
}
