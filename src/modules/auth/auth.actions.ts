"use server";

import { createSafeAction } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth-utils";
import { sendVerificationOTP } from "@/lib/mail";

/** Six-digit OTP from a cryptographically secure source. */
function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const OTP_MAX_ATTEMPTS = 5;

type OtpType = "VERIFY_EMAIL" | "RESET_PASSWORD";

/** Replace any existing code of this type and issue a fresh one. */
async function issueOtp(identifier: string, type: OtpType): Promise<string> {
  const token = generateOtp();
  const expires = new Date(Date.now() + OTP_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier, type } });
  await prisma.verificationToken.create({
    data: { identifier, token, type, expires },
  });

  return token;
}

/**
 * Count a wrong OTP guess against the account.
 *
 * A six-digit code is brute-forceable when the attacker can distribute
 * requests across IPs, and the per-IP limiter cannot see that. After a few
 * failures the code is invalidated and the user has to request a new one.
 */
async function recordFailedOtpAttempt(
  identifier: string,
  type: OtpType
): Promise<void> {
  const current = await prisma.verificationToken.findFirst({
    where: { identifier, type },
    orderBy: { expires: "desc" },
    select: { id: true, attempts: true },
  });

  if (!current) return;

  if (current.attempts + 1 >= OTP_MAX_ATTEMPTS) {
    await prisma.verificationToken.deleteMany({ where: { identifier, type } });
    return;
  }

  await prisma.verificationToken.update({
    where: { id: current.id },
    data: { attempts: { increment: 1 } },
  });
}

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const register = createSafeAction(
  async ({ email, password }: z.infer<typeof registerSchema>) => {
    const parsed = registerSchema.safeParse({ email, password });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid registration data");
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Do not reveal whether the address is already registered. If the
      // account exists but is still unverified, re-send a code so the signup
      // flow can complete; otherwise silently succeed.
      if (!existingUser.isEmailVerified && !existingUser.emailVerified) {
        const token = await issueOtp(existingUser.email, "VERIFY_EMAIL");
        await sendVerificationOTP(existingUser.email, token);
      }
      return { message: "Verification email sent" };
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(parsed.data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = await issueOtp(user.email, "VERIFY_EMAIL");
    await sendVerificationOTP(user.email, token);

    return { message: "Verification email sent" };
  },
  {
    rateLimitKey: "auth_register",
    rateLimitMax: 5,
    rateLimitWindow: 3600, // 5 per hour
  }
);

const resendSchema = z.object({ email: z.string().trim().email() });

export const resendVerificationEmail = createSafeAction(
  async ({ email }: z.infer<typeof resendSchema>) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return the same response: distinguishing "user not found" from
    // "already verified" lets anyone test whether an address is registered.
    if (user && !user.isEmailVerified && !user.emailVerified) {
      const token = await issueOtp(normalizedEmail, "VERIFY_EMAIL");
      await sendVerificationOTP(normalizedEmail, token);
    }

    return { success: true, message: "Verification email sent" };
  },
  {
    rateLimitKey: "auth_resend_verification",
    rateLimitMax: 5,
    rateLimitWindow: 3600,
  }
);

const verifyEmailSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().length(6),
});

export const verifyEmail = createSafeAction(
  async ({ email, token }: z.infer<typeof verifyEmailSchema>) => {
    const parsed = verifyEmailSchema.safeParse({ email, token });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid verification code");
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token: parsed.data.token,
        type: "VERIFY_EMAIL",
        expires: { gt: new Date() }
      }
    });

    if (!verification) {
      await recordFailedOtpAttempt(normalizedEmail, "VERIFY_EMAIL");
      throw new Error("Invalid or expired code");
    }

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { isEmailVerified: true }
    });

    await prisma.verificationToken.delete({
      where: { id: verification.id }
    });

    return { success: true };
  },
  {
    rateLimitKey: "auth_verify_email",
    rateLimitMax: 10,
    rateLimitWindow: 3600,
  }
);

const requestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
});

export const requestPasswordReset = createSafeAction(
  async ({ email }: z.infer<typeof requestPasswordResetSchema>) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Return success anyway to prevent email enumeration
      return { success: true };
    }

    const token = await issueOtp(normalizedEmail, "RESET_PASSWORD");

    const { sendPasswordResetOTP } = await import('@/lib/mail');
    await sendPasswordResetOTP(normalizedEmail, token);

    return { success: true };
  },
  {
    rateLimitKey: "auth_forgot_password",
    rateLimitMax: 5,
    rateLimitWindow: 3600,
  }
);

const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().length(6),
  newPassword: z.string().min(8),
});

export const resetPassword = createSafeAction(
  async ({ email, token, newPassword }: z.infer<typeof resetPasswordSchema>) => {
    const parsed = resetPasswordSchema.safeParse({ email, token, newPassword });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid reset request");
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token: parsed.data.token,
        type: "RESET_PASSWORD",
        expires: { gt: new Date() }
      }
    });

    if (!verification) {
      await recordFailedOtpAttempt(normalizedEmail, "RESET_PASSWORD");
      throw new Error("Invalid or expired code");
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, salt);

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash, isEmailVerified: true } // Also verify email since they own it
    });

    await prisma.verificationToken.delete({
      where: { id: verification.id }
    });

    return { success: true };
  },
  {
    rateLimitKey: "auth_reset_password",
    rateLimitMax: 10,
    rateLimitWindow: 3600,
  }
);
