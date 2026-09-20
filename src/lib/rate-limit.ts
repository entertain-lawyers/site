import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

// In-memory fallback for local development if Redis is not configured
const memoryCache = new Map<string, number>();

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Use Upstash Redis if we are in production/staging or if credentials exist
  // We check for NODE_ENV strictly to prevent memory cache in production
  const useMemoryFallback =
    (env.NODE_ENV === "development" || env.NODE_ENV === "test") &&
    (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN);

  if (useMemoryFallback) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `${identifier}_${Math.floor(now / windowMs)}`;
    
    const current = memoryCache.get(key) ?? 0;
    
    if (current >= limit) {
      return { success: false, limit, remaining: 0, reset: now + windowMs };
    }
    
    memoryCache.set(key, current + 1);
    
    // Cleanup old keys periodically (naive approach for dev)
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

  // Ensure production doesn't accidentally use the fallback if vars are missing
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("🚨 CRITICAL SECURITY ERROR: Upstash Redis credentials (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) are missing in a non-development environment. Distributed rate limiting is disabled. Failing safely (denying operation).");
    throw new Error("Upstash Redis credentials are required in non-development environments to enforce secure rate limiting.");
  }

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
  });

  const res = await ratelimit.limit(identifier);

  return {
    success: res.success,
    limit: res.limit,
    remaining: res.remaining,
    reset: res.reset,
  };
}
