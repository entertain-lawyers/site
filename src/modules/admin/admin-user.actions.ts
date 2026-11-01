'use server';

import { createSafeAction, UserFacingError } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { normalizeEmail } from '@/lib/auth-utils';
import { isRecordInUseError, isRecordNotFoundError, isUniqueConstraintError } from '@/lib/prisma-errors';
import { isContentAuthorRole } from '@/lib/content-authors';

const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must not exceed 128 characters'),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().trim().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must not exceed 128 characters').optional().or(z.literal('')),
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
  // Explicit local-user → WordPress author id mapping, one per install.
  wpAuthorIdEn: z.number().int().positive().nullable().optional(),
  wpAuthorIdNe: z.number().int().positive().nullable().optional(),
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
    throw new UserFacingError('Cannot remove the last admin account.');
  }
}

export const createUserAction = createSafeAction(async (args: z.infer<typeof createUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new UserFacingError('Unauthorized');
  }

  const parsed = createUserSchema.safeParse(args);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message || 'Invalid user details');
  }

  const email = normalizeEmail(parsed.data.email);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new UserFacingError('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  let created;
  try {
    created = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: parsed.data.role,
        isEmailVerified: true,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new UserFacingError('User with this email already exists');
    }
    throw error;
  }

  // Role changes and account creation are the highest-risk admin operations;
  // keep an audit trail of who did what.
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entityType: 'USER',
        entityId: created.id,
        details: { email: created.email, role: created.role },
      },
    });
  } catch (auditError) {
    console.error('[AdminUsers] User created but audit log write failed:', auditError);
  }

  revalidatePath('/admin/users');
  return { success: true, user: created };
});

export const updateUserAction = createSafeAction(async (args: z.infer<typeof updateUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new UserFacingError('Unauthorized');
  }

  const parsed = updateUserSchema.safeParse(args);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message || 'Invalid user details');
  }

  const input = parsed.data;
  const targetUser = await prisma.user.findUnique({
    where: { id: input.id },
    select: { id: true, email: true, role: true },
  });
  if (!targetUser) throw new UserFacingError('User not found');

  const updateData: Prisma.UserUpdateInput = {};

  if (input.email) updateData.email = normalizeEmail(input.email);

  if (input.role) {
    if (targetUser.email === 'admin@entertainlawyers.com' && input.role !== Role.ADMIN) {
      throw new UserFacingError('The main admin role cannot be changed.');
    }
    if (input.id === session.userId && input.role !== Role.ADMIN) {
      throw new UserFacingError('You cannot remove your own admin role.');
    }
    if (targetUser.role === Role.ADMIN && input.role !== Role.ADMIN) {
      await assertNotLastAdmin(targetUser.id);
    }
    updateData.role = input.role;
    // Force a fresh JWT for the target user so a demotion/promotion takes
    // effect even for a tab that already holds the old role.
    if (input.role !== targetUser.role) {
      updateData.sessionVersion = { increment: 1 };
    }
  }

  if (input.password && input.password.length >= 8) {
    updateData.passwordHash = await bcrypt.hash(input.password, 12);
    // Invalidate the user's existing sessions after an admin-set password.
    updateData.sessionVersion = { increment: 1 };
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

  const targetRole = input.role ?? targetUser.role;
  if ((input.wpAuthorIdEn || input.wpAuthorIdNe) && !isContentAuthorRole(targetRole)) {
    throw new UserFacingError('Only Administrators and Editors can be mapped to WordPress authors.');
  }

  if (input.wpAuthorIdEn) {
    const existing = await prisma.user.findFirst({
      where: { wpAuthorIdEn: input.wpAuthorIdEn, id: { not: targetUser.id } },
      select: { id: true, name: true, email: true },
    });
    if (existing) {
      throw new UserFacingError(
        `English WordPress author #${input.wpAuthorIdEn} is already mapped to ${existing.name || existing.email}.`
      );
    }
  }

  if (input.wpAuthorIdNe) {
    const existing = await prisma.user.findFirst({
      where: { wpAuthorIdNe: input.wpAuthorIdNe, id: { not: targetUser.id } },
      select: { id: true, name: true, email: true },
    });
    if (existing) {
      throw new UserFacingError(
        `Nepali WordPress author #${input.wpAuthorIdNe} is already mapped to ${existing.name || existing.email}.`
      );
    }
  }

  if (input.wpAuthorIdEn !== undefined) updateData.wpAuthorIdEn = input.wpAuthorIdEn;
  if (input.wpAuthorIdNe !== undefined) updateData.wpAuthorIdNe = input.wpAuthorIdNe;

  const changedKeys = Object.keys(updateData);

  try {
    await prisma.user.update({
      where: { id: input.id },
      data: updateData,
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const target = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : undefined;
      if (Array.isArray(target) && target.includes('wpAuthorIdEn')) {
        throw new UserFacingError('That English WordPress author is already mapped to another user.');
      }
      if (Array.isArray(target) && target.includes('wpAuthorIdNe')) {
        throw new UserFacingError('That Nepali WordPress author is already mapped to another user.');
      }
      throw new UserFacingError('User with this email already exists');
    }
    if (isRecordNotFoundError(error)) throw new UserFacingError('User not found');

    // If migration 20261027150000_add_user_profile_fields has not been deployed yet,
    // gracefully retry with only base fields (email, role, password, name, image).
    const baseData: Prisma.UserUpdateInput = { ...updateData };
    delete baseData.firstName;
    delete baseData.lastName;
    delete baseData.nickname;
    delete baseData.bio;
    delete baseData.website;
    delete baseData.wpAuthorIdEn;
    delete baseData.wpAuthorIdNe;

    try {
      await prisma.user.update({
        where: { id: input.id },
        data: baseData,
        select: { id: true },
      });
    } catch (retryError) {
      if (isUniqueConstraintError(retryError)) throw new UserFacingError('User with this email already exists');
      if (isRecordNotFoundError(retryError)) throw new UserFacingError('User not found');
      throw retryError;
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
          ...(input.wpAuthorIdEn !== undefined ? { wpAuthorIdEn: input.wpAuthorIdEn } : {}),
          ...(input.wpAuthorIdNe !== undefined ? { wpAuthorIdNe: input.wpAuthorIdNe } : {}),
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
    throw new UserFacingError('Unauthorized');
  }

  const parsed = deleteUserSchema.safeParse(args);
  if (!parsed.success) {
    throw new UserFacingError('Invalid user id');
  }

  const { id } = parsed.data;

  if (id === session.userId) {
    throw new UserFacingError('You cannot delete yourself');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!targetUser) throw new UserFacingError('User not found');

  if (targetUser.email === 'admin@entertainlawyers.com') {
    throw new UserFacingError('The main admin account cannot be deleted.');
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
      throw new UserFacingError('This user has related sessions, content, payments, entitlements, or logs and cannot be deleted safely. Disable or change their role instead.');
    }
    if (isRecordNotFoundError(error)) throw new UserFacingError('User not found');
    throw error;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: targetUser.id,
        details: { email: targetUser.email, role: targetUser.role },
      },
    });
  } catch (auditError) {
    console.error('[AdminUsers] User deleted but audit log write failed:', auditError);
  }

  revalidatePath('/admin/users');
  return { success: true };
});
