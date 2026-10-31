import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

// Per-process fallback. It is weaker than Redis across multiple instances but
// keeps every caller bounded when Upstash is disabled or unhealthy.
//
// Each entry carries its own reset time. Cleanup used to derive a key's age
// from the *current caller's* window, so a 60-second limiter (page views,
// 5% of calls) deleted the 15-minute login and 5-minute consultation counters
// and reset those limits early.
const memoryCache = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${windowSeconds}:${identifier}`;

  let entry = memoryCache.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: windowStart + windowMs };
    memoryCache.set(key, entry);
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count += 1;

  // Naive cleanup; cheap enough for the small number of keys a site this size uses.
  if (Math.random() < 0.05) {
    for (const [k, value] of memoryCache) {
      if (value.resetAt <= now) memoryCache.delete(k);
    }
  }

  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

// One limiter per (limit, window) pair instead of a new client on every call.
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${limit}:${windowSeconds}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: false,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // `RATE_LIMITING_ENABLED` is the documented switch for distributed limiting
  // (see src/env.ts). When it is off we still apply the in-memory limiter as
  // best-effort protection.
  const rateLimitingEnabled = env.RATE_LIMITING_ENABLED === "true";

  const upstashConfigured =
    rateLimitingEnabled &&
    Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) &&
    typeof env.UPSTASH_REDIS_REST_URL === 'string' &&
    !env.UPSTASH_REDIS_REST_URL.includes("dummy");

  if (!rateLimitingEnabled || !upstashConfigured) {
    if (rateLimitingEnabled) {
      console.error(
        "🚨 RATE_LIMITING_ENABLED=true but Upstash is not configured. Using per-process limiting."
      );
    }
    return inMemoryLimit(identifier, limit, windowSeconds);
  }

  try {
    const res = await getUpstashLimiter(limit, windowSeconds).limit(identifier);
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  } catch (error) {
    // A Redis outage must not remove the cap entirely. Fall back locally.
    console.warn("⚠️ Upstash rate limit failed, using in-memory fallback:", (error as Error)?.message);
    return inMemoryLimit(identifier, limit, windowSeconds);
  }
}
