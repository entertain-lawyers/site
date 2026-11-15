/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

process.env.AUTH_SECRET = 'test-secret-must-be-at-least-32-characters-long';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => (key === 'x-forwarded-for' ? '127.0.0.1' : null)),
  })),
}));

vi.mock('@/lib/mail', () => ({
  sendVerificationOTP: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetOTP: vi.fn().mockResolvedValue(undefined),
}));

const { mockUser, mockPasswordResetToken, mockVerificationToken } = vi.hoisted(() => ({
  mockUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  mockPasswordResetToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  mockVerificationToken: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: mockUser,
    passwordResetToken: mockPasswordResetToken,
    verificationToken: mockVerificationToken,
    $transaction: vi.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return (arg as any)({
          user: mockUser,
          passwordResetToken: mockPasswordResetToken,
        });
      }
      return arg;
    }),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 }),
}));

import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
  resetPassword,
  register,
  verifyEmail,
  resendVerificationEmail,
} from '../auth.actions';
import { sendPasswordResetOTP, sendVerificationOTP } from '@/lib/mail';
import { rateLimit } from '@/lib/rate-limit';
import { NO_ACCOUNT_MESSAGE } from '@/lib/auth-utils';

describe('Production-Ready Email OTP Forgot Password System', () => {
  const testUser = {
    id: 'user-uuid-123',
    email: 'advocate@example.com',
    passwordHash: '$2b$12$OldHashOldHashOldHashOldHashOldHashOldHashOldHash',
    isEmailVerified: true,
    sessionVersion: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. OTP Generation, Delivery & Anti-Enumeration', () => {
    it('generates a 6-digit OTP, stores hashed OTP in DB, and sends branded email', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue(null); // No previous token (no cooldown)
      mockPasswordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPasswordResetToken.create.mockResolvedValue({
        id: 'token-uuid-1',
        userId: testUser.id,
      });

      const res = await requestPasswordReset({ email: 'Advocate@Example.Com ' }); // Test mixed case + whitespace

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.message).toContain('If an account exists');
        // Ensure OTP is NEVER leaked in response
        expect((res.data as any).otp).toBeUndefined();
        expect((res.data as any).token).toBeUndefined();
      }

      // 1. Verify user was queried with normalized email
      expect(mockUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'advocate@example.com' },
        select: { id: true, email: true, passwordHash: true },
      });

      // 2. Verify previous tokens were invalidated
      expect(mockPasswordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: testUser.id, consumedAt: null },
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      });

      // 3. Verify OTP was created in DB with 5-minute expiry & hashed
      expect(mockPasswordResetToken.create).toHaveBeenCalledTimes(1);
      const createCall = mockPasswordResetToken.create.mock.calls[0][0].data;
      expect(createCall.userId).toBe(testUser.id);
      expect(createCall.attempts).toBe(0);
      expect(createCall.hashedOtp).toBeDefined();
      expect(createCall.hashedOtp.startsWith('$2')).toBe(true); // Bcrypt hash

      // Expiration must be ~5 minutes (300 seconds) from now
      const fiveMinFromNow = Date.now() + 5 * 60 * 1000;
      expect(Math.abs(createCall.expiresAt.getTime() - fiveMinFromNow)).toBeLessThan(5000);

      // 4. Verify email was sent with a 6-digit plain text code
      expect(sendPasswordResetOTP).toHaveBeenCalledTimes(1);
      const [recipient, sentOtp] = (sendPasswordResetOTP as any).mock.calls[0];
      expect(recipient).toBe('advocate@example.com');
      expect(sentOtp).toMatch(/^\d{6}$/);

      // Verify stored hash matches the sent OTP
      const isMatch = await bcrypt.compare(sentOtp, createCall.hashedOtp);
      expect(isMatch).toBe(true);
    });

    it('explicitly rejects an unregistered email without creating a token or sending email', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      const res = await requestPasswordReset({ email: 'nonexistent@example.com' });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe(NO_ACCOUNT_MESSAGE);
      }

      // Did NOT create a token or send email
      expect(mockPasswordResetToken.create).not.toHaveBeenCalled();
      expect(sendPasswordResetOTP).not.toHaveBeenCalled();
      expect(mockUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
        select: { id: true, email: true, passwordHash: true },
      });
    });

    it('rejects an OAuth-only account (no local password) with an actionable message and no OTP', async () => {
      mockUser.findUnique.mockResolvedValue({ id: 'oauth-user', email: 'google@example.com', passwordHash: null });

      const res = await requestPasswordReset({ email: 'google@example.com' });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Google/i);
      }
      expect(mockPasswordResetToken.create).not.toHaveBeenCalled();
      expect(sendPasswordResetOTP).not.toHaveBeenCalled();
    });

    it('enforces 60-second cooldown on consecutive OTP requests', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      // Recent token created 20 seconds ago
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-uuid-1',
        createdAt: new Date(Date.now() - 20 * 1000),
      });

      const res = await requestPasswordReset({ email: testUser.email });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Please wait \d+ seconds before requesting a new code/i);
      }

      // No new token created, no new email sent
      expect(mockPasswordResetToken.create).not.toHaveBeenCalled();
      expect(sendPasswordResetOTP).not.toHaveBeenCalled();
    });

    it('allows resend when cooldown period has passed (> 60 seconds)', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      // Previous token created 65 seconds ago (cooldown expired)
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-uuid-old',
        createdAt: new Date(Date.now() - 65 * 1000),
      });
      mockPasswordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockPasswordResetToken.create.mockResolvedValue({ id: 'token-uuid-new' });

      const res = await requestPasswordReset({ email: testUser.email });

      expect(res.success).toBe(true);
      expect(mockPasswordResetToken.create).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetOTP).toHaveBeenCalledTimes(1);
    });

    it('rate limits excessive password reset requests per email', async () => {
      (rateLimit as any).mockResolvedValueOnce({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 900000,
      });

      const res = await requestPasswordReset({ email: testUser.email });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/too many requests/i);
      }
    });
  });

  describe('2. OTP Verification & Brute-Force Protection', () => {
    const rawOtp = '482915';
    let hashedOtp: string;

    beforeEach(async () => {
      hashedOtp = await bcrypt.hash(rawOtp, 10);
    });

    it('rejects invalid OTP, increments attempts count, and informs remaining attempts', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        hashedOtp,
        attempts: 1, // already 1 attempt made
        expiresAt: new Date(Date.now() + 4 * 60 * 1000),
        consumedAt: null,
        verifiedAt: null,
      });
      mockPasswordResetToken.update.mockResolvedValue({});

      const res = await verifyPasswordResetOtp({
        email: testUser.email,
        otp: '999999', // wrong OTP
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        // 1 + 1 = 2 attempts made, 3 remaining
        expect(res.error).toContain('3 attempts remaining');
      }

      // Verify attempts incremented in DB
      expect(mockPasswordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: expect.objectContaining({ attempts: { increment: 1 } }),
      });
    });

    it('invalidates OTP and locks out when reaching maximum 5 attempts', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        hashedOtp,
        attempts: 4, // 4th attempt already made
        expiresAt: new Date(Date.now() + 4 * 60 * 1000),
        consumedAt: null,
        verifiedAt: null,
      });
      mockPasswordResetToken.update.mockResolvedValue({});

      const res = await verifyPasswordResetOtp({
        email: testUser.email,
        otp: '999999', // 5th failure!
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Maximum verification attempts exceeded/i);
      }

      // Verify record was marked consumed/invalidated
      expect(mockPasswordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: expect.objectContaining({
          attempts: { increment: 1 },
          consumedAt: expect.any(Date),
        }),
      });
    });

    it('rejects expired OTPs (exceeded 5 minutes)', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        hashedOtp,
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        consumedAt: null,
        verifiedAt: null,
      });
      mockPasswordResetToken.update.mockResolvedValue({});

      const res = await verifyPasswordResetOtp({
        email: testUser.email,
        otp: rawOtp,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/expired/i);
      }
      expect(mockPasswordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('verifies valid OTP, generates 64-char resetToken, and stamps verifiedAt', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        hashedOtp,
        attempts: 0,
        expiresAt: new Date(Date.now() + 4 * 60 * 1000),
        consumedAt: null,
        verifiedAt: null,
      });
      mockPasswordResetToken.update.mockResolvedValue({});

      const res = await verifyPasswordResetOtp({
        email: testUser.email,
        otp: rawOtp,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.resetToken).toBeDefined();
        expect(res.data.resetToken.length).toBe(64); // 32 bytes hex
      }

      // Verify DB claim: atomic updateMany stamps verifiedAt, stores token,
      // and extends expiry to 15m for the reset phase
      expect(mockPasswordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'token-1',
          verifiedAt: null,
          consumedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: {
          verifiedAt: expect.any(Date),
          token: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('prevents single-use OTP reuse', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      // Record already verified (verifiedAt is not null)
      mockPasswordResetToken.findFirst.mockResolvedValue(null);

      const res = await verifyPasswordResetOtp({
        email: testUser.email,
        otp: rawOtp,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Invalid or expired/i);
      }
    });
  });

  describe('3. Password Reset, Session Invalidation & Token Invalidation', () => {
    const validResetToken = 'a'.repeat(64);
    const validPassword = 'NewSecurePassword123!';

    it('rejects password update if passwords do not match', async () => {
      const res = await resetPasswordWithToken({
        email: testUser.email,
        token: validResetToken,
        newPassword: validPassword,
        confirmPassword: 'MismatchPassword999!',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/passwords do not match/i);
      }
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it('rejects password shorter than 8 characters', async () => {
      const res = await resetPasswordWithToken({
        email: testUser.email,
        token: validResetToken,
        newPassword: 'short',
        confirmPassword: 'short',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/at least 8 characters/i);
      }
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it('rejects expired or unverified resetToken', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue(null); // No active verified token found

      const res = await resetPasswordWithToken({
        email: testUser.email,
        token: validResetToken,
        newPassword: validPassword,
        confirmPassword: validPassword,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Invalid or expired password reset session/i);
      }
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it('updates password in transaction, increments sessionVersion, wipes token, and verifies email', async () => {
      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst.mockResolvedValue({
        id: 'token-rec-1',
        userId: testUser.id,
        token: validResetToken,
        verifiedAt: new Date(),
        consumedAt: null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      mockUser.update.mockResolvedValue({});
      mockPasswordResetToken.update.mockResolvedValue({});
      mockPasswordResetToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await resetPasswordWithToken({
        email: testUser.email,
        token: validResetToken,
        newPassword: validPassword,
        confirmPassword: validPassword,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.message).toContain('successfully');
      }

      // Verify User update: password is a bcrypt hash (starts with $2), sessionVersion incremented, email verified
      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: expect.objectContaining({
          passwordHash: expect.stringMatching(/^\$2[aby]?\$\d+\$/),
          isEmailVerified: true,
          sessionVersion: { increment: 1 },
        }),
      });

      // Verify token consumption & wipe (atomic claim inside the transaction)
      expect(mockPasswordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'token-rec-1',
          verifiedAt: { not: null },
          consumedAt: null,
          token: validResetToken,
        },
        data: {
          consumedAt: expect.any(Date),
          token: null,
        },
      });

      // Verify any other tokens for this user are invalidated
      expect(mockPasswordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: testUser.id,
          consumedAt: null,
        },
        data: {
          consumedAt: expect.any(Date),
        },
      });
    });

    it('supports backward-compatible resetPassword call with direct 6-digit OTP', async () => {
      const rawOtp = '123456';
      const hashedOtp = await bcrypt.hash(rawOtp, 10);

      mockUser.findUnique.mockResolvedValue(testUser);
      mockPasswordResetToken.findFirst
        .mockResolvedValueOnce({
          id: 'token-1',
          userId: testUser.id,
          hashedOtp,
          attempts: 0,
          expiresAt: new Date(Date.now() + 4 * 60 * 1000),
          consumedAt: null,
          verifiedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'token-1',
          userId: testUser.id,
          token: expect.any(String),
          verifiedAt: new Date(),
          consumedAt: null,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

      mockPasswordResetToken.update.mockResolvedValue({});
      mockUser.update.mockResolvedValue({});
      mockPasswordResetToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await resetPassword({
        email: testUser.email,
        token: rawOtp,
        newPassword: validPassword,
      });

      expect(res.success).toBe(true);
      expect(mockUser.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Registration & Email Verification Lifecycle', () => {
    const regEmail = 'new.user@example.com';
    const regUser = { id: 'user-reg-1', email: regEmail, passwordHash: '$2b$12$Hash', isEmailVerified: false, emailVerified: null };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    const registerArgs = {
      name: 'New User',
      email: regEmail,
      password: 'Str0ngPass!23',
      confirmPassword: 'Str0ngPass!23',
    };

    it('rejects mismatched confirm password without creating an account', async () => {
      const res = await register({ ...registerArgs, confirmPassword: 'Different1!23' });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Passwords do not match/i);
      }
      expect(mockUser.create).not.toHaveBeenCalled();
      expect(sendVerificationOTP).not.toHaveBeenCalled();
    });

    it('creates an unverified account, stores a hashed 5-minute OTP, and sends the verification email', async () => {
      mockUser.findUnique.mockResolvedValue(null);
      mockUser.create.mockResolvedValue(regUser);
      mockVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockVerificationToken.create.mockResolvedValue({ id: 'vt-1' });

      const res = await register(registerArgs);

      expect(res.success).toBe(true);
      expect(mockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: regEmail,
            name: 'New User',
          }),
        })
      );

      // Only one verification token exists, previous ones invalidated first
      expect(mockVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: regEmail, type: 'VERIFY_EMAIL' },
      });
      const createData = mockVerificationToken.create.mock.calls[0][0].data;
      expect(createData.token.startsWith('$2')).toBe(true); // hashed, not plaintext
      expect(Math.abs(createData.expires.getTime() - (Date.now() + 5 * 60 * 1000))).toBeLessThan(5000);

      // Raw OTP goes to the email only, never in the response
      const [, sentOtp] = (sendVerificationOTP as any).mock.calls[0];
      expect(sentOtp).toMatch(/^\d{6}$/);
      await expect(bcrypt.compare(sentOtp, createData.token)).resolves.toBe(true);
    });

    it('re-issues a code for an existing unverified account without changing its password', async () => {
      mockUser.findUnique.mockResolvedValue(regUser);
      mockVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockVerificationToken.create.mockResolvedValue({ id: 'vt-2' });

      const res = await register(registerArgs);

      expect(res.success).toBe(true);
      expect(mockUser.create).not.toHaveBeenCalled();
      expect(mockVerificationToken.create).toHaveBeenCalledTimes(1);
      expect(sendVerificationOTP).toHaveBeenCalledTimes(1);
    });

    it('verifies a correct OTP atomically: single-use token claim then guarded user update', async () => {
      mockVerificationToken.findFirst.mockResolvedValue({
        id: 'vt-3',
        token: await bcrypt.hash('654321', 10),
        identifier: regEmail,
        type: 'VERIFY_EMAIL',
        expires: new Date(Date.now() + 4 * 60 * 1000),
        attempts: 0,
      });
      mockVerificationToken.deleteMany.mockResolvedValue({ count: 1 });
      mockUser.updateMany.mockResolvedValue({ count: 1 });

      const res = await verifyEmail({ email: regEmail, token: '654321' });

      expect(res.success).toBe(true);

      // Single-use: the claim deletes the row guarded by its id and expiry
      expect(mockVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: { id: 'vt-3', expires: expect.objectContaining({ gt: expect.any(Date) }) },
      });
      // Unverified → verified only, in one guarded update
      expect(mockUser.updateMany).toHaveBeenCalledWith({
        where: { email: regEmail, isEmailVerified: false, emailVerified: null },
        data: { isEmailVerified: true },
      });
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it('rejects a wrong OTP and records the failed attempt', async () => {
      mockVerificationToken.findFirst.mockResolvedValue({
        id: 'vt-4',
        token: await bcrypt.hash('111111', 10),
        identifier: regEmail,
        type: 'VERIFY_EMAIL',
        expires: new Date(Date.now() + 4 * 60 * 1000),
        attempts: 1,
      });
      mockVerificationToken.update.mockResolvedValue({});

      const res = await verifyEmail({ email: regEmail, token: '999999' });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Invalid or expired code/i);
      }
      expect(mockVerificationToken.update).toHaveBeenCalledWith({
        where: { id: 'vt-4' },
        data: { attempts: { increment: 1 } },
      });
      expect(mockUser.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a reused/consumed OTP (claim count 0 means a concurrent verify won)', async () => {
      mockVerificationToken.findFirst.mockResolvedValue({
        id: 'vt-5',
        token: await bcrypt.hash('222222', 10),
        identifier: regEmail,
        type: 'VERIFY_EMAIL',
        expires: new Date(Date.now() + 4 * 60 * 1000),
        attempts: 0,
      });
      mockVerificationToken.deleteMany.mockResolvedValue({ count: 0 });

      const res = await verifyEmail({ email: regEmail, token: '222222' });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/request a new code/i);
      }
      expect(mockUser.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an expired OTP without consuming anything', async () => {
      mockVerificationToken.findFirst.mockResolvedValue(null); // expired rows fail the expires>now filter

      const res = await verifyEmail({ email: regEmail, token: '333333' });

      expect(res.success).toBe(false);
      expect(mockUser.updateMany).not.toHaveBeenCalled();
    });

    it('locks out verification after the maximum 5 attempts', async () => {
      // 4 failed attempts already recorded; this wrong guess is the 5th
      mockVerificationToken.findFirst.mockResolvedValue({
        id: 'vt-6',
        token: await bcrypt.hash('444444', 10),
        identifier: regEmail,
        type: 'VERIFY_EMAIL',
        expires: new Date(Date.now() + 4 * 60 * 1000),
        attempts: 4, // next failure reaches the limit
      });

      const res = await verifyEmail({ email: regEmail, token: '000000' });

      expect(res.success).toBe(false);
      // recordFailedOtpAttempt deletes the token once attempts + 1 >= 5
      expect(mockVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: regEmail, type: 'VERIFY_EMAIL' },
      });
    });

    it('enforces a 60-second resend cooldown', async () => {
      mockUser.findUnique.mockResolvedValue(regUser);
      mockVerificationToken.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 20 * 1000) });

      const res = await resendVerificationEmail({ email: regEmail });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Please wait \d+ seconds before requesting a new code/i);
      }
      expect(mockVerificationToken.create).not.toHaveBeenCalled();
      expect(sendVerificationOTP).not.toHaveBeenCalled();
    });

    it('resends when the cooldown has passed', async () => {
      mockUser.findUnique.mockResolvedValue(regUser);
      mockVerificationToken.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 65 * 1000) });
      mockVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockVerificationToken.create.mockResolvedValue({ id: 'vt-7' });

      const res = await resendVerificationEmail({ email: regEmail });

      expect(res.success).toBe(true);
      expect(mockVerificationToken.create).toHaveBeenCalledTimes(1);
      expect(sendVerificationOTP).toHaveBeenCalledTimes(1);
    });

    it('responds identically for unknown emails on resend (no enumeration, no email)', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      const res = await resendVerificationEmail({ email: 'ghost@example.com' });

      expect(res.success).toBe(true);
      expect(mockVerificationToken.create).not.toHaveBeenCalled();
      expect(sendVerificationOTP).not.toHaveBeenCalled();
    });
  });
});
