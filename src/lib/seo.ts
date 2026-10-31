import type { Metadata } from 'next';
import { env } from '@/env';

const FALLBACK_SITE_URL = 'https://www.entertainlawyers.com';

/**
 * Single source of truth for the public origin used by canonical links,
 * robots.txt, the sitemap, Open Graph and JSON-LD.
 *
 * `NEXT_PUBLIC_APP_URL` is the validated configuration source (see
 * `src/env.ts`: a real URL, never localhost in production) and is already the
 * base URL for payment callbacks, so SEO cannot drift to a different host.
 * The fallback only keeps a misconfigured build working instead of throwing.
 */
export function getSiteUrl(): string {
  try {
    return new URL(env.NEXT_PUBLIC_APP_URL).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/**
 * Opinion pieces are listed and rendered under /blogs (the home page groups
 * them as "Blog, Opinion, Others"). A post tagged both Blog and Opinion maps
 * to OPINION, so checking for BLOG alone made /blogs link to its own 404s.
 */
export function isBlogRouteType(type: string): boolean {
  return type === 'BLOG' || type === 'OPINION';
}

/**
 * Maps a WordPress post type to the public route that actually renders it, or
 * `null` when this site has no route for that category (the semester/case-note
 * categories are not exposed as articles). Used by the sitemap so it never
 * advertises a URL that would 404.
 */
export function wordPressArticlePath(
  type: string,
  id: number,
  lang: 'en' | 'ne'
): string | null {
  if (lang === 'ne') return type.startsWith('NEPALI_') ? `/nepali/post/${id}` : null;
  if (type === 'NEWS') return `/news/${id}`;
  if (isBlogRouteType(type)) return `/blogs/${id}`;
  if (type === 'FACT' || type === 'PERSONALITY') return `/historical-facts/${id}`;
  return null;
}

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

/**
 * Serialize JSON-LD for an inline <script>. JSON.stringify alone lets a
 * `</script>` inside any CMS/editor value close the tag and inject markup, so
 * escape the HTML-significant characters (the result is still valid JSON).
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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
      url: `${getSiteUrl()}${canonical}`,
      type: 'article',
      publishedTime: publishedTime || undefined,
      modifiedTime: modifiedTime || undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}
