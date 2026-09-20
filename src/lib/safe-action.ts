import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { Role } from "@prisma/client";
import { headers } from "next/headers";

type ActionOptions = {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimitKey?: string;
  rateLimitMax?: number;
  rateLimitWindow?: number;
};

export function createSafeAction<TArgs, TReturn>(
  action: (args: TArgs, context: { userId?: string; role?: Role }) => Promise<TReturn>,
  options: ActionOptions = {}
) {
  return async (args: TArgs): Promise<{ success: true; data: TReturn } | { success: false; error: string }> => {
    try {
      const session = await auth();
      const userId = session?.user?.id;
      const role = session?.user?.role;

      // Authentication Check
      if (options.requireAuth && !userId) {
        return { success: false, error: "Unauthorized: Please log in." };
      }

      // Admin Check
      if (options.requireAdmin && role !== "ADMIN") {
        return { success: false, error: "Forbidden: Admin access required." };
      }

      // Rate Limiting
      if (options.rateLimitKey) {
        const headersList = await headers();
        // Fallback to IP or user ID
        const ip = headersList.get("x-forwarded-for") ?? "unknown-ip";
        const identifier = userId ?? ip;
        const key = `${options.rateLimitKey}_${identifier}`;

        const { success } = await rateLimit(key, options.rateLimitMax ?? 10, options.rateLimitWindow ?? 60);
        
        if (!success) {
          return { success: false, error: "Too many requests. Please try again later." };
        }
      }

      const data = await action(args, { userId, role });
      return { success: true, data };
    } catch (error: any) {
      console.error("Action error:", error);
      return { success: false, error: error.message || "An unexpected error occurred." };
    }
  };
}
