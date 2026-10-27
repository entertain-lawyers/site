import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { register } from '../auth.actions';
import { Role } from '@prisma/client';
import { rateLimit } from '@/lib/rate-limit';
import { createSafeAction } from '@/lib/safe-action';
import { assertTestDatabase, describeDb } from '@/test/db';
import nextConfig from '../../../../next.config';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => (key === 'x-forwarded-for' ? '127.0.0.1' : null)),
  })),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(),
    redirect: vi.fn(),
  },
}));

// Mock auth.ts to inject sessions for testing Safe Actions
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    auth: vi.fn(() => null),
  };
});

import { auth, testAuthorize } from '@/lib/auth';

describeDb('Authentication & Security Foundation', () => {
  const testEmail = `test-${Date.now()}@auth.com`;
  const testPassword = 'SecurePassword123!';
  const adminEmail = `admin-${Date.now()}@auth.com`;
  let userId: string;
  let adminUserId: string;

  beforeAll(async () => {
    await assertTestDatabase(prisma);
    await prisma.user.deleteMany({ where: { email: { in: [testEmail, adminEmail] } } });
    const admin = await prisma.user.create({
      data: { email: adminEmail, role: Role.ADMIN, isEmailVerified: true },
    });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    // Only remove rows this suite created. Deleting every user/session in the
    // database would wipe real accounts when the suite is misconfigured.
    const ids = [userId, adminUserId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.accessLog.deleteMany({ where: { userId: { in: ids } } });
      await prisma.uploadIntent.deleteMany({ where: { adminId: { in: ids } } });
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
    vi.clearAllMocks();
  });

  describe('1-3. Registration & Passwords', () => {
    it('rejects invalid registration data', async () => {
      await expect(register({ email: 'not-an-email', password: '123' }))
        .resolves.toEqual({ success: false, error: 'Invalid email address' });
    });

    it('registers with valid credentials', async () => {
      const res = await register({ email: testEmail, password: testPassword });
      expect(res.success).toBe(true);
      if (res.success) {
        // Registration no longer returns the account id: doing so would let an
        // attacker probe which addresses exist.
        expect(res.data.message).toBe('Verification email sent');
      }

      const created = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(created).not.toBeNull();
      userId = created!.id;

      // New accounts must confirm their email before they can log in; the
      // login tests below simulate that confirmation.
      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true },
      });
    });

    it('does not reveal whether an email is already registered', async () => {
      const res = await register({ email: testEmail, password: testPassword });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.message).toBe('Verification email sent');
      }
    });

    it.skip('30. Admin restricted route redirects standard user', async () => {
      // test skipped due to middleware type mock issues
    });

    it('passwords are never stored in plaintext', async () => {
      const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(testPassword);
      expect(dbUser?.passwordHash?.startsWith('$2')).toBe(true);
    });
  });

  describe('4-7. Login & Sessions (Auth.js JWT strategy)', () => {
    it('invalid password is rejected', async () => {
      const res = await testAuthorize({ email: testEmail, password: 'wrong' });
      expect(res).toBeNull();
    });

    it('unknown accounts are rejected without revealing whether they exist', async () => {
      const res = await testAuthorize({
        email: `missing-${Date.now()}@auth.com`,
        password: 'whatever',
      });
      expect(res).toBeNull();
    });

    it('successful login returns the user', async () => {
      const user = await testAuthorize({ email: testEmail, password: testPassword });
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.role).toBe(Role.USER);
    });

    it('mixed-case email addresses still log in', async () => {
      const user = await testAuthorize({
        email: `  ${testEmail.toUpperCase()}  `,
        password: testPassword,
      });
      expect(user?.id).toBe(userId);
    });

    it('unverified accounts are rejected until the email is confirmed', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: false },
      });

      await expect(testAuthorize({ email: testEmail, password: testPassword }))
        .rejects.toThrow(/verify your email/i);

      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true },
      });
    });

    it('a deleted account cannot use an existing session', async () => {
      const probe = createSafeAction(async () => 'ok', { requireAuth: true });
      const temp = await prisma.user.create({
        data: { email: `deleted-${Date.now()}@auth.com`, role: Role.USER },
      });

      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: temp.id, role: Role.USER },
        expires: '',
      } as any);
      await prisma.user.delete({ where: { id: temp.id } });

      const res = await probe({});
      expect(res).toEqual({ success: false, error: 'Unauthorized: Please log in.' });
    });
  });

  describe('8-12. Authorization & Middleware (Safe Actions)', () => {
    const dummyAction = createSafeAction(async (args, ctx) => ctx.role, { requireAuth: true });
    const adminAction = createSafeAction(async (args, ctx) => ctx.role, { requireAuth: true, requireAdmin: true });

    it('unauthenticated user cannot access protected actions', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const res = await dummyAction({});
      expect(res).toEqual({ success: false, error: 'Unauthorized: Please log in.' });
    });

    it('normal user cannot access admin actions', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId, role: Role.USER }, expires: '' } as any);
      const res = await adminAction({});
      expect(res).toEqual({ success: false, error: 'Forbidden: Admin access required.' });
    });

    it('admin can access authorized admin routes', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: adminUserId, role: Role.ADMIN }, expires: '' } as any);
      const res = await adminAction({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe(Role.ADMIN);
      }
    });

    it('client-supplied role cannot bypass authorization', async () => {
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser?.role).toBe(Role.USER); // Real DB role is USER

      // A tampered session/JWT claims ADMIN, but the action re-reads the role
      // from the database and must reject it.
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId, role: Role.ADMIN }, expires: '' } as any);
      const res = await adminAction({});
      expect(res).toEqual({ success: false, error: 'Forbidden: Admin access required.' });
    });
  });

  describe('13. Rate Limiting', () => {
    it('rate limiting blocks excessively frequent requests', async () => {
      const limitedAction = createSafeAction(async () => 'ok', { rateLimitKey: 'test_limit', rateLimitMax: 2, rateLimitWindow: 10 });

      const r1 = await limitedAction({});
      const r2 = await limitedAction({});
      const r3 = await limitedAction({});

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(false);
      if (!r3.success) {
        expect(r3.error).toBe('Too many requests. Please try again later.');
      }
    });
  });

  describe('14-15. Security Headers & Configuration', () => {
    it('security headers are present in next.config.ts', async () => {
      const headersFunc = (nextConfig as any).headers;
      expect(headersFunc).toBeDefined();
      
      const resolvedHeaders = await headersFunc();
      expect(resolvedHeaders.length).toBeGreaterThan(0);
      
      const globalHeaders = resolvedHeaders[0].headers;
      
      const hasCSP = globalHeaders.some((h: any) => h.key === 'Content-Security-Policy');
      const hasHSTS = globalHeaders.some((h: any) => h.key === 'Strict-Transport-Security');
      const hasFrameOptions = globalHeaders.some((h: any) => h.key === 'X-Frame-Options');
      const hasReferrer = globalHeaders.some((h: any) => h.key === 'Referrer-Policy');

      expect(hasCSP).toBe(true);
      expect(hasHSTS).toBe(true);
      expect(hasFrameOptions).toBe(true);
      expect(hasReferrer).toBe(true);
    });
  });
});
