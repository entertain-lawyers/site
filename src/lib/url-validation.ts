/**
 * Image/document fields are stored as a site path (`/uploads/...`,
 * `/api/media/...`) or an absolute http(s) URL. Anything else — `javascript:`,
 * `data:`, protocol-relative `//host` — is rejected at save time.
 */
export function isSafeAssetUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/')) return !/^\/[/\\]/.test(trimmed);
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export const SAFE_ASSET_URL_MESSAGE = 'Image and document links must be a site path starting with / or an http(s) URL';

/** True for strings `new Date()` can turn into a real date. */
export function isValidDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
