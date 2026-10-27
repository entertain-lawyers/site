import { z } from 'zod';

/**
 * Rules shared by the admin redirect form and the proxy that applies them.
 * Keeping the path helpers here means the UI, the action and the request
 * pipeline all agree on what a "source" is.
 */

/** Normalise a path for comparison: leading slash, no trailing slash. */
export function normalizePath(path: string): string {
  let value = path.trim();
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1 && value.endsWith('/')) value = value.replace(/\/+$/, '');
  return value || '/';
}

/**
 * Areas where a redirect must never interfere with auth or the app shell.
 * A rule pointing at one of these paths would never fire, so the form rejects
 * it instead of storing dead data.
 */
export const REDIRECT_EXEMPT_PREFIXES = [
  '/api',
  '/_next',
  '/admin',
  '/dashboard',
  '/read',
  '/payment',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const;

/** The site root is served by the homepage, so it can never be a source. */
export function isRedirectExempt(pathname: string): boolean {
  if (pathname === '/') return true;
  return REDIRECT_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

const sourceSchema = z
  .string()
  .trim()
  .min(1, 'Source path is required')
  .max(500)
  .refine(
    (value) =>
      value.startsWith('/') &&
      !value.startsWith('//') &&
      // Query strings, fragments and spaces are not part of a path match.
      !/[?#\s]/.test(value),
    'Source must be a site path such as /old-page (no query, hash or spaces)'
  )
  .refine(
    (value) => !isRedirectExempt(normalizePath(value)),
    'This path is handled by the app and cannot be redirected'
  );

const destinationSchema = z
  .string()
  .trim()
  .min(1, 'Destination is required')
  .max(1000)
  .refine(
    (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
    'Destination must start with / or http(s)://'
  );

export const redirectSchema = z.object({
  source: sourceSchema,
  destination: destinationSchema,
  statusCode: z.coerce
    .number()
    .int()
    .refine((code) => [301, 302, 307, 308].includes(code), 'Use 301, 302, 307 or 308')
    .default(301),
  isActive: z.boolean().default(true),
  notes: optionalText(500),
});

export const updateRedirectSchema = redirectSchema.extend({
  id: z.string().uuid('Invalid redirect id'),
});

export const redirectIdSchema = z.object({
  id: z.string().uuid('Invalid redirect id'),
});
