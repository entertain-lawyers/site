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

  try {
    await prisma.user.update({
      where: { id: input.id },
      data: updateData
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('User with this email already exists');
    if (isRecordNotFoundError(error)) throw new Error('User not found');
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'USER',
      entityId: targetUser.id,
      details: {
        email: targetUser.email,
        role: input.role ?? targetUser.role,
        passwordChanged: Boolean(input.password),
      },
    },
  });

  revalidatePath('/admin/users');
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
