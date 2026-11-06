import { getWordPressPostById, mapCategoryToType, parseWordPressPostId } from '@/lib/wordpress';

/**
 * Shared historical-fact / personality existence check. `getWordPressPostById`
 * is wrapped in React `cache`, so the layout, metadata and page share one
 * WordPress request per render instead of fetching the same post three times.
 */
export async function getPublishedHistoricalFact(segment: string) {
  const wpId = parseWordPressPostId(segment);
  if (!wpId) return null;

  const wpPost = await getWordPressPostById(wpId, 'en');
  if (!wpPost || wpPost.status !== 'publish') {
    return null;
  }
  const type = mapCategoryToType(wpPost.categories, 'en');
  if (type !== 'FACT' && type !== 'PERSONALITY') {
    return null;
  }

  return { wpPost, type };
}
