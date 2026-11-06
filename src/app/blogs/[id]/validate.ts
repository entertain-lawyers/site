import { getWordPressPostById, mapCategoryToType, parseWordPressPostId } from '@/lib/wordpress';
import { isBlogRouteType } from '@/lib/seo';

/**
 * Shared blog-detail existence check. `getWordPressPostById` is wrapped in
 * React `cache`, so the layout, metadata and page share one WordPress request
 * per render instead of fetching the same post three times.
 */
export async function getPublishedBlogPost(segment: string) {
  const wpId = parseWordPressPostId(segment);
  if (!wpId) return null;

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || !isBlogRouteType(mapCategoryToType(wpPost.categories, 'en'))) {
    return null;
  }

  return wpPost;
}
