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
    .map(p => {
      const type = mapCategoryToType(p.categories, lang);
      const idStr = String(p.id);
      return {
        id: idStr,
        title: p.title.rendered,
        type,
        createdAt: new Date(p.date),
        featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        url: type === 'NEWS' ? `/news/${idStr}` : type === 'BLOG' ? `/blogs/${idStr}` : `/historical-facts/${idStr}`
      };
    });

  // Prefer posts belonging to a routed content type so sidebar links
  // resolve to real /news, /blogs and /historical-facts pages.
  const routed = items.filter(p => p.type !== 'UNKNOWN');
  return (routed.length >= limit ? routed : [...routed, ...items.filter(p => p.type === 'UNKNOWN')]).slice(0, limit);
}
