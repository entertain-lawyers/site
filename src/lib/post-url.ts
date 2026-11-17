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
  // If a Prisma resource UUID is supplied, it lives under /resources
  const isPrismaUuid =
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isPrismaUuid) {
    return `/resources/${id}`;
  }

  switch (type) {
    case 'BLOG':
    case 'OPINION':
    case 'CASE_LAW':
      return `/blogs/${id}`;
    case 'NEWS':
      return `/news/${id}`;
    case 'FACT':
    case 'PERSONALITY':
      return `/historical-facts/${id}`;
    default:
      return `/news/${id}`;
  }
}
