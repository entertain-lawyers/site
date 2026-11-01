/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, Prisma } from '@prisma/client';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

// Mock auth
let currentSession: { user?: { id: string; role: Role; email: string } } | null = null;
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => currentSession),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed_${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
  },
}));

type MockUser = {
  id: string;
  email: string;
  passwordHash?: string | null;
  role: Role;
  name?: string | null;
  image?: string | null;
  createdAt: Date;
  sessionVersion?: number;
  emailVerified?: Date | null;
  isEmailVerified?: boolean;
};

let mockUsers: MockUser[] = [];
let mockAuditLogs: any[] = [];
let failAuditLog = false;

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) {
          return mockUsers.find((u) => u.id === where.id) ?? null;
        }
        if (where.email) {
          return mockUsers.find((u) => u.email === where.email) ?? null;
        }
        return null;
      }),
      findMany: vi.fn(async () => mockUsers),
      count: vi.fn(async ({ where }: { where?: any }) => {
        let list = mockUsers;
        if (where?.role) {
          list = list.filter((u) => u.role === where.role);
        }
        if (where?.id?.not) {
          list = list.filter((u) => u.id !== where.id.not);
        }
        return list.length;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const existing = mockUsers.find((u) => u.email === data.email);
        if (existing) {
          const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.0.0',
            meta: { target: ['email'] },
          });
          throw err;
        }
        const newUser: MockUser = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          name: data.name ?? null,
          image: data.image ?? null,
          createdAt: new Date(),
          sessionVersion: 0,
          emailVerified: data.emailVerified ?? null,
          isEmailVerified: data.isEmailVerified ?? false,
        };
        mockUsers.push(newUser);
        return newUser;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        const user = mockUsers.find((u) => u.id === where.id);
        if (!user) {
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '6.0.0',
          });
        }
        if (data.email) user.email = data.email;
        if (data.role) user.role = data.role;
        if (data.passwordHash) user.passwordHash = data.passwordHash;
        if (data.sessionVersion?.increment) {
          user.sessionVersion = (user.sessionVersion || 0) + data.sessionVersion.increment;
        }
        return user;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = mockUsers.findIndex((u) => u.id === where.id);
        if (idx === -1) {
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '6.0.0',
          });
        }
        const [deleted] = mockUsers.splice(idx, 1);
        return deleted;
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: any }) => {
        if (failAuditLog) {
          throw new Error('AuditLog database write failed');
        }
        mockAuditLogs.push({ id: `audit-${Date.now()}`, ...data });
        return { id: 'audit-id' };
      }),
    },
  },
}));

import { createUserAction, updateUserAction, deleteUserAction } from '../admin-user.actions';

describe('admin-user.actions', () => {
  beforeEach(() => {
    failAuditLog = false;
    mockAuditLogs = [];
    mockUsers = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@entertainlawyers.com',
        role: Role.ADMIN,
        name: 'Main Admin',
        createdAt: new Date(),
        sessionVersion: 0,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'secondary-admin@example.com',
        role: Role.ADMIN,
        name: 'Secondary Admin',
        createdAt: new Date(),
        sessionVersion: 0,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'existing-editor@example.com',
        role: Role.EDITOR,
        name: 'Existing Editor',
        createdAt: new Date(),
        sessionVersion: 0,
      },
    ];

    currentSession = {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@entertainlawyers.com',
        role: Role.ADMIN,
      },
    };
  });

  describe('createUserAction', () => {
    it('successfully creates an editor with a valid password', async () => {
      const result = await createUserAction({
        email: 'new-editor@example.com',
        password: 'securepassword123',
        role: Role.EDITOR,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toBeDefined();
        expect(result.data.user.email).toBe('new-editor@example.com');
        expect(result.data.user.role).toBe(Role.EDITOR);
      }

      const created = mockUsers.find((u) => u.email === 'new-editor@example.com');
      expect(created).toBeDefined();
      expect(created?.role).toBe(Role.EDITOR);
      expect(created?.passwordHash).toBe('hashed_securepassword123');
      expect(mockAuditLogs).toHaveLength(1);
      expect(mockAuditLogs[0].action).toBe('CREATE');
    });

    it('rejects passwords shorter than 8 characters with a clear user-facing error (reproduces reported bug)', async () => {
      // In the bug screenshot: user entered "abc1234" (7 chars) and got "An unexpected error occurred."
      const result = await createUserAction({
        email: 'abc@123.com',
        password: 'abc1234',
        role: Role.EDITOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Password must be at least 8 characters');
        expect(result.error).not.toBe('An unexpected error occurred. Please try again.');
      }
    });

    it('rejects invalid email formats with a readable message', async () => {
      const result = await createUserAction({
        email: 'not-an-email',
        password: 'password123',
        role: Role.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid email address');
      }
    });

    it('rejects duplicate emails gracefully', async () => {
      const result = await createUserAction({
        email: 'admin@entertainlawyers.com',
        password: 'password123',
        role: Role.EDITOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('User with this email already exists');
      }
    });

    it('rejects non-admin sessions', async () => {
      currentSession = {
        user: {
          id: 'editor-1',
          email: 'existing-editor@example.com',
          role: Role.EDITOR,
        },
      };

      const result = await createUserAction({
        email: 'unauthorized-try@example.com',
        password: 'password123',
        role: Role.EDITOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized');
      }
    });

    it('creates a user with an exact 8-character password boundary', async () => {
      const result = await createUserAction({
        email: 'boundary@example.com',
        password: '12345678',
        role: Role.USER,
      });

      expect(result.success).toBe(true);
      const created = mockUsers.find((u) => u.email === 'boundary@example.com');
      expect(created).toBeDefined();
      expect(created?.role).toBe(Role.USER);
      expect(created?.isEmailVerified).toBe(true);
      expect(created?.emailVerified).toBeInstanceOf(Date);
    });

    it('creates an admin user when requested by another admin', async () => {
      const result = await createUserAction({
        email: 'newadmin@example.com',
        password: 'adminpassword123',
        role: Role.ADMIN,
      });

      expect(result.success).toBe(true);
      const created = mockUsers.find((u) => u.email === 'newadmin@example.com');
      expect(created).toBeDefined();
      expect(created?.role).toBe(Role.ADMIN);
    });

    it('rejects passwords exceeding 128 characters', async () => {
      const result = await createUserAction({
        email: 'longpw@example.com',
        password: 'a'.repeat(129),
        role: Role.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Password must not exceed 128 characters');
      }
    });

    it('rejects invalid role selection', async () => {
      const result = await createUserAction({
        email: 'invalidrole@example.com',
        password: 'password123',
        role: 'SUPERADMIN' as any,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid option');
      }
    });

    it('rejects unauthenticated requests (null session)', async () => {
      currentSession = null;
      const result = await createUserAction({
        email: 'anon@example.com',
        password: 'password123',
        role: Role.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized');
      }
    });

    it('succeeds even if audit log creation fails (resilience)', async () => {
      failAuditLog = true;
      const result = await createUserAction({
        email: 'resilient-user@example.com',
        password: 'password123',
        role: Role.USER,
      });

      expect(result.success).toBe(true);
      const created = mockUsers.find((u) => u.email === 'resilient-user@example.com');
      expect(created).toBeDefined();
    });
  });

  describe('updateUserAction password validation', () => {
    it('rejects updating password to less than 8 characters', async () => {
      const result = await updateUserAction({
        id: '33333333-3333-4333-8333-333333333333',
        password: 'short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Password must be at least 8 characters');
      }
    });

    it('updates password and increments sessionVersion when password is >= 8 characters', async () => {
      const result = await updateUserAction({
        id: '33333333-3333-4333-8333-333333333333',
        password: 'newstrongpassword',
      });

      expect(result.success).toBe(true);
      const updated = mockUsers.find((u) => u.id === '33333333-3333-4333-8333-333333333333');
      expect(updated?.passwordHash).toBe('hashed_newstrongpassword');
      expect(updated?.sessionVersion).toBe(1);
    });

    it('allows empty password string without changing existing password or session version', async () => {
      const original = mockUsers.find((u) => u.id === '33333333-3333-4333-8333-333333333333');
      const originalHash = original?.passwordHash;
      const originalVersion = original?.sessionVersion;

      const result = await updateUserAction({
        id: '33333333-3333-4333-8333-333333333333',
        password: '',
      });

      expect(result.success).toBe(true);
      const updated = mockUsers.find((u) => u.id === '33333333-3333-4333-8333-333333333333');
      expect(updated?.passwordHash).toBe(originalHash);
      expect(updated?.sessionVersion).toBe(originalVersion);
    });

    it('rejects update passwords exceeding 128 characters', async () => {
      const result = await updateUserAction({
        id: '33333333-3333-4333-8333-333333333333',
        password: 'p'.repeat(129),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Password must not exceed 128 characters');
      }
    });
  });

  describe('deleteUserAction', () => {
    it('prevents an admin from deleting themselves', async () => {
      const result = await deleteUserAction({ id: '11111111-1111-4111-8111-111111111111' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('You cannot delete yourself');
      }
    });

    it('prevents deleting the main admin', async () => {
      currentSession = {
        user: {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'secondary-admin@example.com',
          role: Role.ADMIN,
        },
      };

      const result = await deleteUserAction({ id: '11111111-1111-4111-8111-111111111111' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('The main admin account cannot be deleted.');
      }
    });

    it('succeeds even if audit log creation fails (resilience on delete)', async () => {
      failAuditLog = true;
      currentSession = {
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'admin@entertainlawyers.com',
          role: Role.ADMIN,
        },
      };

      const result = await deleteUserAction({ id: '33333333-3333-4333-8333-333333333333' });
      expect(result.success).toBe(true);
      const deleted = mockUsers.find((u) => u.id === '33333333-3333-4333-8333-333333333333');
      expect(deleted).toBeUndefined();
    });
  });
});
