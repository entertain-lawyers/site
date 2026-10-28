'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { normalizeEmail } from '@/lib/auth-utils';
import { isRecordInUseError, isRecordNotFoundError, isUniqueConstraintError } from '@/lib/prisma-errors';

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.nativeEnum(Role).optional(),
  // WP-parity profile fields (user-edit screen)
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  nickname: z.string().max(100).optional(),
  website: z.union([
    z.literal(''),
    z.string().max(300).regex(/^https?:\/\/\S+\.\S+/, 'Website must start with http(s):// and look like a URL'),
  ]).optional(),
  bio: z.string().max(1200).optional(),
  // Optional display-name override; if absent, name stays untouched.
  displayName: z.string().max(150).optional(),
  // Profile picture — "" clears it, URL sets it (uploaded via media intent flow).
  image: z.string().max(2048).optional().or(z.literal('')),
});

const deleteUserSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Removing the only ADMIN would leave the site with no way to administer it.
 * Only call this when an existing admin is being demoted or deleted.
 */
async function assertNotLastAdmin(targetId: string) {
  const otherAdmins = await prisma.user.count({
    where: { role: Role.ADMIN, id: { not: targetId } },
  });
  if (otherAdmins === 0) {
    throw new Error('Cannot remove the last admin account.');
  }
}

export const createUserAction = createSafeAction(async (args: z.infer<typeof createUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  const parsed = createUserSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid user details');
  }

  const email = normalizeEmail(parsed.data.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role: parsed.data.role,
      isEmailVerified: true,
    }
  });

  // Role changes and account creation are the highest-risk admin operations;
  // keep an audit trail of who did what.
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'CREATE',
      entityType: 'USER',
      entityId: created.id,
      details: { email: created.email, role: created.role },
    },
  });

  revalidatePath('/admin/users');
  return { success: true };
});

export const updateUserAction = createSafeAction(async (args: z.infer<typeof updateUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  const parsed = updateUserSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid user details');
  }

  const input = parsed.data;
  const targetUser = await prisma.user.findUnique({ where: { id: input.id } });
  if (!targetUser) throw new Error('User not found');

  const updateData: Prisma.UserUpdateInput = {};

  if (input.email) updateData.email = normalizeEmail(input.email);

  if (input.role) {
    if (targetUser.email === 'admin@entertainlawyers.com' && input.role !== Role.ADMIN) {
      throw new Error('The main admin role cannot be changed.');
    }
    if (input.id === session.userId && input.role !== Role.ADMIN) {
      throw new Error('You cannot remove your own admin role.');
    }
    if (targetUser.role === Role.ADMIN && input.role !== Role.ADMIN) {
      await assertNotLastAdmin(targetUser.id);
    }
    updateData.role = input.role;
  }

  if (input.password && input.password.length >= 6) {
    updateData.passwordHash = await bcrypt.hash(input.password, 12);
  }

  // Profile fields — trimmed; WP stores "biographical info" alongside names
  // and the display name lives in `name` ("Display name publicly as").
  if (input.firstName !== undefined) updateData.firstName = input.firstName.trim() || null;
  if (input.lastName !== undefined) updateData.lastName = input.lastName.trim() || null;
  if (input.nickname !== undefined) updateData.nickname = input.nickname.trim() || null;
  if (input.bio !== undefined) updateData.bio = input.bio.trim() || null;
  if (input.website !== undefined) updateData.website = input.website.trim() || null;
  if (input.displayName !== undefined && input.displayName.trim()) {
    updateData.name = input.displayName.trim();
  }
  if (input.image !== undefined) updateData.image = input.image || null;

  const changedKeys = Object.keys(updateData);

  try {
    await prisma.user.update({
      where: { id: input.id },
      data: updateData
    });
  } catch (error) {
    // If migration 20261027150000_add_user_profile_fields has not been deployed yet,
    // gracefully retry with only base fields (email, role, password, name, image).
    const isColumnMissing =
      (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2022') ||
      (error instanceof Error && error.message.includes('does not exist'));

    if (isColumnMissing) {
      const baseData: Prisma.UserUpdateInput = { ...updateData };
      delete baseData.firstName;
      delete baseData.lastName;
      delete baseData.nickname;
      delete baseData.bio;
      delete baseData.website;
      await prisma.user.update({
        where: { id: input.id },
        data: baseData,
      });
    } else {
      if (isUniqueConstraintError(error)) throw new Error('User with this email already exists');
      if (isRecordNotFoundError(error)) throw new Error('User not found');
      throw error;
    }
  }

  // Audit every save (role/password changes + profile fields), merged from the
  // security hardening audit and the profile editor's USER_PROFILE logging.
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entityType: 'USER_PROFILE',
        entityId: targetUser.id,
        details: {
          email: targetUser.email,
          role: input.role ?? targetUser.role,
          passwordChanged: Boolean(input.password),
          fields: changedKeys,
        },
      },
    });
  } catch (auditError) {
    console.error('[AdminUsers] User updated but audit log write failed:', auditError);
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${input.id}/edit`);
  return { success: true };
});

export const deleteUserAction = createSafeAction(async (args: z.infer<typeof deleteUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  const parsed = deleteUserSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error('Invalid user id');
  }

  const { id } = parsed.data;

  if (id === session.userId) {
    throw new Error('You cannot delete yourself');
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw new Error('User not found');

  if (targetUser.email === 'admin@entertainlawyers.com') {
    throw new Error('The main admin account cannot be deleted.');
  }

  if (targetUser.role === Role.ADMIN) {
    await assertNotLastAdmin(targetUser.id);
  }

  try {
    await prisma.user.delete({
      where: { id }
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('This user has related sessions, content, payments, entitlements, or logs and cannot be deleted safely. Disable or change their role instead.');
    }
    if (isRecordNotFoundError(error)) throw new Error('User not found');
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'DELETE',
      entityType: 'USER',
      entityId: targetUser.id,
      details: { email: targetUser.email, role: targetUser.role },
    },
  });

  revalidatePath('/admin/users');
  return { success: true };
});
