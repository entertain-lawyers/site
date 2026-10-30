/**
 * Best-effort client IP used for rate limiting.
 *
 * `x-forwarded-for` and `x-real-ip` can be supplied by the client unless the
 * hosting edge rewrites them, so a request may carry a random value on every
 * call and land in a fresh rate-limit bucket. Read the header the deploy
 * platform is known to overwrite, then fall back to the last `x-forwarded-for`
 * hop (the one appended by the closest trusted proxy).
 */
export function getClientIp(headersList: {
  get(name: string): string | null;
}): string {
  // Vercel overwrites x-real-ip with the connecting client address.
  if (process.env.VERCEL) {
    const vercelIp = headersList.get('x-real-ip')?.trim();
    if (vercelIp) return vercelIp;
  }

  // Netlify sets this itself; it is ignored elsewhere because a client could
  // send it directly to a host that does not overwrite it.
  if (process.env.NETLIFY) {
    const netlifyIp = headersList.get('x-nf-client-connection-ip')?.trim();
    if (netlifyIp) return netlifyIp;
  }

  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return headersList.get('x-real-ip')?.trim() || 'unknown-ip';
}
