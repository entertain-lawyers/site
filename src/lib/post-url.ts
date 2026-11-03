/**
 * Resolves the canonical public URL for a post based on its id, type, and language.
 * Safe to import in both Server Actions and Client Components.
 */
export function getPublicPostUrl({
  id,
  type,
  lang,
}: {
  id: string | number;
  type?: string;
  lang: 'en' | 'ne';
}): string {
  if (lang === 'ne' || type?.startsWith('NEPALI_')) {
    return `/nepali/post/${id}`;
  }
  switch (type) {
    case 'BLOG':
    case 'OPINION':
      return `/blogs/${id}`;
    case 'NEWS':
      return `/news/${id}`;
    case 'FACT':
    case 'PERSONALITY':
      return `/historical-facts/${id}`;
    case 'CASE_LAW':
      return `/resources/${id}`;
    default:
      return `/news/${id}`;
  }
}
