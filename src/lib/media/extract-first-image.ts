import legacyImageMap from './legacy-image-map.json';

const imageMap = legacyImageMap as Record<string, string>;

/**
 * Extracts the first image from a block of HTML content.
 * Resolves legacy WordPress URLs to the new B2-backed /api/media routes
 * by looking up the Phase 7 migration manifest.
 */
export function extractFirstImage(content: string | null | undefined): string | null {
  if (!content) return null;

  // 1. Extract the first meaningful image URL from post.content
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = content.match(imgRegex);

  if (!match || !match[1]) {
    return null;
  }

  let src = match[1];

  // Decode HTML entities if any
  src = src.replace(/&amp;/g, '&');

  // 2. Identify if it is a legacy WordPress URL
  // Variations:
  // https://entertainlawyers.com/wp-content/uploads/2024/11/fevicon.png
  // http://entertainlawyers.com/wp-content/uploads/...
  // /wp-content/uploads/...
  if (src.includes('wp-content/uploads/')) {
    // 3. Extract the 'uploads/...' portion
    const uploadPathMatch = src.match(/wp-content\/(uploads\/.*)$/i);
    if (uploadPathMatch && uploadPathMatch[1]) {
      let sourcePath = uploadPathMatch[1];
      
      // Sometimes URL has query parameters which are not in the mapping (e.g., ?w=1024)
      sourcePath = sourcePath.split('?')[0];

      // 4. Resolve against existing migrated media mapping
      const b2Key = imageMap[sourcePath];

      if (b2Key) {
        // 5. Return the new application/B2-backed media URL
        // 7. Never expose private B2 documents: the map only contains public prefixes like editorial/
        return `/api/media/${b2Key}`;
      } else {
        // 6. Only fall back to original external URL when no mapping exists
        console.warn(`[MediaResolver] Failed to resolve migrated mapping for: ${sourcePath}`);
      }
    }
  }

  // If not a WP URL, or not found in the mapping, return the original
  return src;
}
