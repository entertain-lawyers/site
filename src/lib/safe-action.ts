import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { headers } from "next/headers";

type ActionOptions = {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimitKey?: string;
  rateLimitMax?: number;
  rateLimitWindow?: number;
};

/**
 * Prefer the address set by the reverse proxy. `x-forwarded-for` is a
 * client-controlled list, so the first entry can be spoofed to get a fresh
 * rate-limit bucket; the last entry is the hop appended closest to us.
 */
function clientIp(headersList: Headers): string {
  const realIp = headersList.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown-ip";
}

export function createSafeAction<TArgs, TReturn>(
  action: (args: TArgs, context: { userId?: string; role?: Role }) => Promise<TReturn>,
  options: ActionOptions = {}
) {
  return async (args: TArgs): Promise<{ success: true; data: TReturn } | { success: false; error: string }> => {
    try {
      const session = await auth();
      let userId = session?.user?.id;
      let role = session?.user?.role;

      // JWT sessions carry the role they were issued with. Re-read it from the
      // database so a demoted admin (or a deleted account) loses access
      // immediately instead of keeping it for the token's 30-day lifetime.
      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (!dbUser) {
          userId = undefined;
          role = undefined;
        } else {
          role = dbUser.role;
        }
      }

      // Authentication Check
      if (options.requireAuth && !userId) {
        return { success: false, error: "Unauthorized: Please log in." };
      }

      // Admin Check
      if (options.requireAdmin && role !== Role.ADMIN) {
        return { success: false, error: "Forbidden: Admin access required." };
      }

      // Rate Limiting
      if (options.rateLimitKey) {
        const headersList = await headers();
        const identifier = userId ?? clientIp(headersList);
        const key = `${options.rateLimitKey}_${identifier}`;

        const { success } = await rateLimit(key, options.rateLimitMax ?? 10, options.rateLimitWindow ?? 60);
        
        if (!success) {
          return { success: false, error: "Too many requests. Please try again later." };
        }
      }

      const data = await action(args, { userId, role });
      return { success: true, data };
    } catch (error) {
      console.error("Action error:", error);
      // Return a generic message to avoid leaking internal error details
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      // Only return safe, user-facing error messages. Database/internal errors get a generic message.
      const isSafeMessage = message.includes('Unauthorized') || message.includes('Forbidden') || message.includes('not found') || message.includes('already') || message.includes('Cannot') || message.includes('Invalid') || message.includes('must') || message.includes('required') || message.includes('expired') || message.includes('Too many') || message.includes('do not have access') || message.includes('do not have permission');
      return { success: false, error: isSafeMessage ? message : "An unexpected error occurred. Please try again." };
    }
  };
}
