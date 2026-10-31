import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import type { z } from "zod";

type ActionOptions = {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimitKey?: string;
  rateLimitMax?: number;
  rateLimitWindow?: number;
};

const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

/**
 * An error whose message is written for the person using the form and is
 * always shown to them. Plain `Error` messages only get through when they
 * contain an allow-listed word, and that check is case-sensitive, so
 * messages such as "…cannot be deleted. Archive it instead." or "You cannot
 * delete yourself" used to reach the admin as "An unexpected error occurred".
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/**
 * Only forward messages that are meant for users. A substring allowlist alone
 * leaked internals because Prisma errors also contain "Invalid" (e.g.
 * "Invalid `prisma.user.create()` invocation ..."), so reject anything that
 * looks like a framework/database failure first.
 */
function toPublicErrorMessage(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  if (!(error instanceof Error)) return GENERIC_ERROR;

  const message = error.message;
  if (
    error.name.startsWith("Prisma") ||
    /prisma|invocation|constraint|SQLSTATE|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed|Cannot read propert|is not a function|jwt|secret/i.test(
      message
    )
  ) {
    return GENERIC_ERROR;
  }

  const isSafeMessage =
    message.includes("Unauthorized") ||
    message.includes("Forbidden") ||
    message.includes("not found") ||
    message.includes("already") ||
    message.includes("Cannot") ||
    message.includes("Invalid") ||
    message.includes("must") ||
    message.includes("required") ||
    message.includes("expired") ||
    message.includes("Too many") ||
    message.includes("WordPress") ||
    message.includes("do not have access") ||
    message.includes("do not have permission");

  return isSafeMessage ? message : GENERIC_ERROR;
}

/**
 * `createSafeAction` passes the raw client payload through, so every action
 * validates it before touching the database. The first issue message is
 * surfaced to the admin form; the prefix keeps it visible through
 * `toPublicErrorMessage`, which only forwards messages it recognises as safe.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, args: unknown): z.infer<T> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues[0]?.message || "please check the form"}`);
  }
  return parsed.data;
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
        const identifier = userId ?? getClientIp(headersList);
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
      return { success: false, error: toPublicErrorMessage(error) };
    }
  };
}
