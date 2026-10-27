/**
 * Best-effort client IP used for rate limiting.
 *
 * `x-forwarded-for` is a client-controlled list: the first entry can be spoofed
 * to obtain a fresh rate-limit bucket on every request. Prefer `x-real-ip`,
 * which our proxy sets, and otherwise take the last hop (the one appended by
 * the closest trusted proxy).
 */
export function getClientIp(headersList: {
  get(name: string): string | null;
}): string {
  const realIp = headersList.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return 'unknown-ip';
}
