import type { Metadata } from 'next';

const SITE_URL = 'https://www.entertainlawyers.com';

/**
 * Turns rendered WordPress HTML into plain text suitable for a meta
 * description. Keeps the tags out of search snippets and normalises
 * whitespace so the result is a single readable line.
 */
export function stripHtmlForMeta(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clamps a description to a length search engines actually display. */
export function truncateMeta(value: string, max = 158): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

interface PostMetadataInput {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  canonical: string;
  image?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  fallbackDescription?: string;
}

/** Shared metadata for the WordPress-backed article and fact pages. */
export function postMetadata({
  title,
  excerpt,
  content,
  canonical,
  image,
  publishedTime,
  modifiedTime,
  fallbackDescription = 'Read the full article on Entertain Lawyers.',
}: PostMetadataInput): Metadata {
  const description =
    truncateMeta(stripHtmlForMeta(excerpt) || stripHtmlForMeta(content)) || fallbackDescription;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      type: 'article',
      publishedTime: publishedTime || undefined,
      modifiedTime: modifiedTime || undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}
