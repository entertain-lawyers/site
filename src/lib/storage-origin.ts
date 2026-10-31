const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Origin of the object-storage endpoint to add to the CSP `connect-src` and
 * `img-src` directives, so the browser may PUT presigned uploads to it.
 *
 * Production only ever trusts an `https:` origin. In development a plain
 * `http:` loopback endpoint (a local S3 mock such as one on
 * localhost:9000) is allowed too; it used to be dropped, so the CSP blocked
 * every local PDF upload and the admin form only said "Failed to fetch".
 */
export function storageOriginForCsp(endpoint: string | undefined, isDev: boolean): string {
  if (!endpoint) return '';
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return '';
  }

  // The origin is pasted into a header; accept only a plain host[:port].
  if (!/^https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?$/.test(url.origin) && !/^http:\/\/\[::1\](?::[0-9]+)?$/.test(url.origin)) {
    return '';
  }
  if (url.protocol === 'https:') return url.origin;
  if (url.protocol === 'http:' && isDev && LOOPBACK_HOSTS.has(url.hostname)) return url.origin;
  return '';
}
