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

/**
 * Guard for server-side fetches of admin-entered document URLs (act PDF
 * proxy): only public http(s) targets — no other schemes, no localhost /
 * internal hostnames, no private or link-local IP literals (SSRF).
 */
export function isFetchableUrl(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  // Bare-IP hosts: only public ranges are allowed.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
    ) {
      return false;
    }
  }
  return true;
}

/** True for strings `new Date()` can turn into a real date. */
export function isValidDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
