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
      throw new Error("Email is already in use");
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(parsed.data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = generateOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        type: "VERIFY_EMAIL",
        expires,
      }
    });

    await sendVerificationOTP(user.email, token);

    return { id: user.id, email: user.email, message: "Verification email sent" };
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

    if (!user) throw new Error("User not found");
    if (user.isEmailVerified) throw new Error("Email is already verified");

    const token = generateOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail, type: "VERIFY_EMAIL" }
    });

    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, type: "VERIFY_EMAIL", expires }
    });

    await sendVerificationOTP(normalizedEmail, token);

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

    const token = generateOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Clear existing tokens of this type for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail, type: "RESET_PASSWORD" }
    });

    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, type: "RESET_PASSWORD", expires }
    });

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
