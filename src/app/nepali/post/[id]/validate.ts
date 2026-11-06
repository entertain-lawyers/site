import { getWordPressPostById, mapCategoryToType, parseWordPressPostId } from '@/lib/wordpress';

/**
 * Shared Nepali-post existence check. `getWordPressPostById` is wrapped in
 * React `cache`, so the layout, metadata and page share one WordPress request
 * per render instead of fetching the same post three times.
 */
export async function getPublishedNepaliPost(segment: string) {
  const wpId = parseWordPressPostId(segment);
  if (!wpId) return null;

  const wpPost = await getWordPressPostById(wpId, 'ne');
  if (!wpPost || wpPost.status !== 'publish') {
    return null;
  }
  if (!mapCategoryToType(wpPost.categories, 'ne').startsWith('NEPALI_')) {
    return null;
  }

  return wpPost;
}
