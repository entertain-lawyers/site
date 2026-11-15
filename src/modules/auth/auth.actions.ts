"use server";

import { createSafeAction, UserFacingError } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomInt, randomBytes } from "crypto";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth-utils";
import { sendVerificationOTP, sendPasswordResetOTP } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

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

    // Explicit select: the default selection loads every schema column, which
    // fails on databases that have not applied the profile-fields migration.
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerified: true,
      },
    });

    if (existingUser) {
      // Do not reveal whether the address is already registered, and do not
      // change the password of an existing account from an unauthenticated
      // signup. Otherwise an attacker who registers a victim's address can
      // have the victim verify the attacker-triggered code and end up with an
      // account whose password the attacker chose. The email owner can still
      // recover access through the reset flow.
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
      select: { id: true, email: true },
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
    const parsed = resendSchema.safeParse({ email });
    if (!parsed.success) {
      throw new UserFacingError("Invalid email address");
    }
    const normalizedEmail = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerified: true,
      },
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
      data: { isEmailVerified: true },
      select: { id: true },
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

const OTP_RESET_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_RESET_MAX_ATTEMPTS = 5;

const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const requestPasswordReset = createSafeAction(
  async ({ email }: z.infer<typeof requestPasswordResetSchema>) => {
    const parsed = requestPasswordResetSchema.safeParse({ email });
    if (!parsed.success) {
      throw new UserFacingError(parsed.error.issues[0]?.message || "Invalid email address");
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    // Rate limit per email address: maximum 5 requests per 15 minutes
    const emailLimiter = await rateLimit(`forgot-password:email:${normalizedEmail}`, 5, 900);
    if (!emailLimiter.success) {
      throw new UserFacingError("Too many password reset requests for this email. Please wait 15 minutes and try again.");
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      // Generic response to prevent email enumeration
      return {
        success: true,
        message: "If an account exists with this email, a 6-digit code has been sent.",
      };
    }

    // Check resend cooldown (60 seconds)
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recentToken) {
      const timeSinceCreation = Date.now() - recentToken.createdAt.getTime();
      if (timeSinceCreation < OTP_RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceCreation) / 1000);
        throw new UserFacingError(`Please wait ${remainingSeconds} seconds before requesting a new code.`);
      }
    }

    // Invalidate previous unconsumed OTPs for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // Generate 6-digit cryptographically secure OTP
    const rawOtp = randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + OTP_RESET_TTL_MS);
    const resendAvailableAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        hashedOtp,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
      },
    });

    await sendPasswordResetOTP(normalizedEmail, rawOtp);

    return {
      success: true,
      message: "If an account exists with this email, a 6-digit code has been sent.",
    };
  },
  {
    rateLimitKey: "auth_forgot_password",
    rateLimitMax: 5,
    rateLimitWindow: 3600, // 5 per hour per IP
  }
);

const verifyPasswordResetOtpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  otp: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const verifyPasswordResetOtp = createSafeAction(
  async ({ email, otp }: z.infer<typeof verifyPasswordResetOtpSchema>) => {
    const parsed = verifyPasswordResetOtpSchema.safeParse({ email, otp });
    if (!parsed.success) {
      throw new UserFacingError(parsed.error.issues[0]?.message || "Invalid verification code");
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    // Rate limit verification attempts per email
    const emailLimiter = await rateLimit(`verify-otp:email:${normalizedEmail}`, 10, 900);
    if (!emailLimiter.success) {
      throw new UserFacingError("Too many verification attempts. Please wait 15 minutes.");
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      throw new UserFacingError("Invalid or expired verification code.");
    }

    // Find the latest active (unconsumed, unverified) reset token record
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        verifiedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new UserFacingError("Invalid or expired verification code. Please request a new code.");
    }

    if (record.attempts >= OTP_RESET_MAX_ATTEMPTS) {
      await prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new UserFacingError("Maximum verification attempts exceeded. Please request a new code.");
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new UserFacingError("This verification code has expired. Please request a new code.");
    }

    const isMatch = await bcrypt.compare(parsed.data.otp, record.hashedOtp);
    if (!isMatch) {
      const nextAttempts = record.attempts + 1;
      await prisma.passwordResetToken.update({
        where: { id: record.id },
        data: {
          attempts: { increment: 1 },
          ...(nextAttempts >= OTP_RESET_MAX_ATTEMPTS ? { consumedAt: new Date() } : {}),
        },
      });

      if (nextAttempts >= OTP_RESET_MAX_ATTEMPTS) {
        throw new UserFacingError("Maximum verification attempts exceeded. Please request a new code.");
      }
      const remaining = OTP_RESET_MAX_ATTEMPTS - nextAttempts;
      throw new UserFacingError(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
    }

    // OTP is valid! Generate a single-use cryptographically secure resetToken (64 hex characters)
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes to enter new password

    // Atomic claim: only one concurrent request can win, because the guard
    // re-checks verifiedAt/consumedAt inside the UPDATE itself.
    const claim = await prisma.passwordResetToken.updateMany({
      where: {
        id: record.id,
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        verifiedAt: new Date(),
        token: resetToken,
        expiresAt: resetTokenExpiresAt,
      },
    });

    if (claim.count === 0) {
      // A concurrent request verified this OTP first: it is now single-use.
      throw new UserFacingError("Invalid or expired verification code. Please request a new code.");
    }

    return {
      success: true,
      resetToken,
      message: "Verification successful. You can now reset your password.",
    };
  },
  {
    rateLimitKey: "auth_verify_reset_otp",
    rateLimitMax: 10,
    rateLimitWindow: 3600,
  }
);

const resetPasswordWithTokenSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address"),
    token: z.string().min(32, "Invalid reset token"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordWithToken = createSafeAction(
  async ({ email, token, newPassword, confirmPassword }: z.infer<typeof resetPasswordWithTokenSchema>) => {
    const parsed = resetPasswordWithTokenSchema.safeParse({ email, token, newPassword, confirmPassword });
    if (!parsed.success) {
      throw new UserFacingError(parsed.error.issues[0]?.message || "Invalid password reset request");
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      throw new UserFacingError("Invalid or expired password reset session.");
    }

    // Verify resetToken
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: parsed.data.token,
        verifiedAt: { not: null },
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new UserFacingError("Invalid or expired password reset session. Please request a new code.");
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, salt);

    // Transaction-safe update: claim the token first inside a transaction; if a
    // concurrent request already consumed it, the throw rolls everything back.
    await prisma.$transaction(async (tx) => {
      const claim = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          verifiedAt: { not: null },
          consumedAt: null,
          token: parsed.data.token,
        },
        data: {
          consumedAt: new Date(),
          token: null, // Clear token so it can never be reused
        },
      });

      if (claim.count === 0) {
        throw new UserFacingError("Invalid or expired password reset session. Please request a new code.");
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isEmailVerified: true,
          sessionVersion: { increment: 1 }, // Invalidates existing sessions across devices
        },
      });

      // Invalidate any other active reset tokens for this user
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      message: "Your password has been changed successfully.",
    };
  },
  {
    rateLimitKey: "auth_reset_password_token",
    rateLimitMax: 10,
    rateLimitWindow: 3600,
  }
);

const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().min(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().optional(),
});

export const resetPassword = createSafeAction(
  async ({ email, token, newPassword, confirmPassword }: z.infer<typeof resetPasswordSchema>) => {
    const parsed = resetPasswordSchema.safeParse({ email, token, newPassword, confirmPassword });
    if (!parsed.success) {
      throw new UserFacingError(parsed.error.issues[0]?.message || "Invalid input");
    }
    // If token length is 6, verify OTP and reset in sequence:
    if (parsed.data.token.length === 6) {
      const verifyRes = await verifyPasswordResetOtp({ email: parsed.data.email, otp: parsed.data.token });
      if (!verifyRes.success) {
        throw new UserFacingError(verifyRes.error || "Invalid or expired code");
      }
      if (!verifyRes.data?.resetToken) {
        throw new UserFacingError("Invalid or expired code");
      }
      return resetPasswordWithToken({
        email: parsed.data.email,
        token: verifyRes.data.resetToken,
        newPassword: parsed.data.newPassword,
        confirmPassword: parsed.data.confirmPassword || parsed.data.newPassword,
      });
    }

    // Otherwise it is already a resetToken
    return resetPasswordWithToken({
      email: parsed.data.email,
      token: parsed.data.token,
      newPassword: parsed.data.newPassword,
      confirmPassword: parsed.data.confirmPassword || parsed.data.newPassword,
    });
  },
  {
    rateLimitKey: "auth_reset_password",
    rateLimitMax: 10,
    rateLimitWindow: 3600,
  }
);
