import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

// Per-process fallback. It is weaker than Redis across multiple instances but
// keeps every caller bounded when Upstash is disabled or unhealthy.
const memoryCache = new Map<string, number>();

function inMemoryLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${identifier}_${Math.floor(now / windowMs)}`;
  const current = memoryCache.get(key) ?? 0;

  if (current >= limit) {
    return { success: false, limit, remaining: 0, reset: now + windowMs };
  }

  memoryCache.set(key, current + 1);

  // Naive cleanup; cheap enough for the small number of keys a site this size uses.
  if (Math.random() < 0.05) {
    for (const [k] of memoryCache.entries()) {
      const timestamp = parseInt(k.split("_").pop() || "0", 10) * windowMs;
      if (now - timestamp > windowMs * 2) {
        memoryCache.delete(k);
      }
    }
  }

  return { success: true, limit, remaining: limit - current - 1, reset: now + windowMs };
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

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
  });

  try {
    const res = await ratelimit.limit(identifier);
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
