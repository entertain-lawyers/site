/**
 * Post-login return URLs. A `callbackUrl` comes from the query string, so it
 * is untrusted: only same-site paths are accepted, never another origin or a
 * protocol-relative URL, and never the auth pages themselves (which would
 * loop back to the login form).
 */

export const DEFAULT_CALLBACK_URL = '/dashboard';

/** `?reason=` value that makes the login page explain the redirect. */
export const STUDY_MATERIAL_LOGIN_REASON = 'study-material';
export const STUDY_MATERIAL_LOGIN_MESSAGE = 'Please sign in to access this study material.';

const LOOPING_PATHS = ['/login', '/register', '/api/auth'];
const PLACEHOLDER_ORIGIN = 'http://callback.invalid';

export function safeCallbackUrl(raw: string | null | undefined, fallback = DEFAULT_CALLBACK_URL): string {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (!value || value.length > 2048) return fallback;

  // Same-site paths only: "/x" yes; "//evil.com", "/\evil.com", "https://…",
  // "javascript:…" no. Control characters are rejected outright because
  // browsers strip them and can turn "/\t/evil.com" into "//evil.com".
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
  if (LOOPING_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Login URL used when an anonymous visitor opens sign-in-gated study material. */
export function studyMaterialLoginUrl(destination: string): string {
  const params = new URLSearchParams({
    callbackUrl: safeCallbackUrl(destination),
    reason: STUDY_MATERIAL_LOGIN_REASON,
  });
  return `/login?${params.toString()}`;
}
