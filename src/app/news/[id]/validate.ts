import { getWordPressPostById, mapCategoryToType, parseWordPressPostId } from '@/lib/wordpress';

/**
 * Shared news-detail existence check. `getWordPressPostById` is wrapped in
 * React `cache`, so the layout, metadata and page share one WordPress request
 * per render instead of fetching the same post three times.
 */
export async function getPublishedNewsPost(segment: string) {
  const wpId = parseWordPressPostId(segment);
  if (!wpId) return null;

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish' || mapCategoryToType(wpPost.categories, 'en') !== 'NEWS') {
    return null;
  }

  return wpPost;
}
