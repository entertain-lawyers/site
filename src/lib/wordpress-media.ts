/**
 * WordPress featured-image rules shared by the browser (early feedback) and
 * the server (the check that counts). Nothing here touches credentials, so it
 * is safe to import from client components.
 */
import type { WordPressLanguage, WordPressMedia } from '@/lib/wordpress';

/** Formats the featured-image uploader accepts, with their file extensions. */
export const WP_MEDIA_ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
};

/**
 * Uploads travel browser -> this server -> WordPress, and Vercel rejects
 * function request bodies above ~4.5 MB, so the limit stays below that.
 */
export const WP_MEDIA_MAX_BYTES = 4 * 1024 * 1024;

export const WP_MEDIA_ACCEPT = Object.keys(WP_MEDIA_ALLOWED_TYPES).join(',');

/** What the browser receives about a media item: URLs and labels only. */
export interface WordPressMediaItem {
  id: number;
  title: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  mimeType: string;
}

/** A featured image chosen in the editor, tied to the WordPress install it lives in. */
export interface FeaturedImageSelection {
  id: number;
  lang: WordPressLanguage;
  url: string | null;
  thumbnailUrl: string | null;
  title: string;
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

/** Type/size check on the declared metadata. Returns an error message or null. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!WP_MEDIA_ALLOWED_TYPES[file.type]) {
    return 'Only JPEG, PNG, WebP and GIF images can be uploaded.';
  }
  if (file.size <= 0) {
    return 'The selected file is empty.';
  }
  if (file.size > WP_MEDIA_MAX_BYTES) {
    return `The image is ${formatMegabytes(file.size)}; the limit is ${formatMegabytes(WP_MEDIA_MAX_BYTES)}. Resize or compress it and try again.`;
  }
  return null;
}

/**
 * Identify the image format from its first bytes, so a renamed or mislabeled
 * file cannot pass as an image just by its declared type.
 */
export function sniffImageMimeType(bytes: Uint8Array): string | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return 'image/gif'; // GIF8
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'; // RIFF....WEBP
  return null;
}

/**
 * A filename WordPress can store: no path, ASCII letters/digits/dashes, and an
 * extension that matches the real format.
 */
export function safeUploadFilename(name: string, mimeType: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const stem = base
    .replace(/\.[^.]*$/, '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 80);
  const extension = WP_MEDIA_ALLOWED_TYPES[mimeType]?.[0] ?? 'bin';
  return `${stem || 'featured-image'}.${extension}`;
}

const decodeTitle = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** Reduce a WordPress media record to what the editor needs. */
export function toWordPressMediaItem(media: WordPressMedia): WordPressMediaItem {
  const sizes = media.media_details?.sizes ?? {};
  const thumb = sizes.medium?.source_url || sizes.thumbnail?.source_url || media.source_url;
  const file = media.media_details?.file?.split('/').pop() || media.source_url.split('/').pop() || `media-${media.id}`;
  return {
    id: media.id,
    title: decodeTitle(media.title?.rendered || '') || file,
    filename: file,
    url: media.source_url,
    thumbnailUrl: thumb,
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
    mimeType: media.mime_type,
  };
}

export function toFeaturedImageSelection(item: WordPressMediaItem, lang: WordPressLanguage): FeaturedImageSelection {
  return { id: item.id, lang, url: item.url, thumbnailUrl: item.thumbnailUrl, title: item.title };
}
