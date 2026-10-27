'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { isRecordInUseError, isRecordNotFoundError, isUniqueConstraintError } from '@/lib/prisma-errors';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
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

export const createUserAction = createSafeAction(async (args: z.infer<typeof createUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.user.findUnique({ where: { email: args.email } });
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(args.password, 12);

  await prisma.user.create({
    data: {
      email: args.email,
      passwordHash: hashedPassword,
      role: args.role,
      isEmailVerified: true,
    }
  });

  revalidatePath('/admin/users');
  return { success: true };
});

export const updateUserAction = createSafeAction(async (args: z.infer<typeof updateUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: args.id } });
  if (!targetUser) throw new Error('User not found');

  const updateData: Prisma.UserUpdateInput = {};

  if (args.email) updateData.email = args.email;

  if (args.role) {
    if (targetUser.email === 'admin@entertainlawyers.com' && args.role !== Role.ADMIN) {
      throw new Error('The main admin role cannot be changed.');
    }
    updateData.role = args.role;
  }

  if (args.password && args.password.length >= 6) {
    updateData.passwordHash = await bcrypt.hash(args.password, 12);
  }

  // Profile fields — trimmed; WP stores "biographical info" alongside names
  // and the display name lives in `name` ("Display name publicly as").
  if (args.firstName !== undefined) updateData.firstName = args.firstName.trim() || null;
  if (args.lastName !== undefined) updateData.lastName = args.lastName.trim() || null;
  if (args.nickname !== undefined) updateData.nickname = args.nickname.trim() || null;
  if (args.bio !== undefined) updateData.bio = args.bio.trim() || null;
  if (args.website !== undefined) updateData.website = args.website.trim() || null;
  if (args.displayName !== undefined && args.displayName.trim()) {
    updateData.name = args.displayName.trim();
  }
  if (args.image !== undefined) updateData.image = args.image || null;

  const changedKeys = Object.keys(updateData);

  try {
    await prisma.user.update({
      where: { id: args.id },
      data: updateData
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('User with this email already exists');
    if (isRecordNotFoundError(error)) throw new Error('User not found');
    throw error;
  }

  // Audit every profile save (WP keeps an edit log too; ours goes to AuditLog).
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'UPDATE',
        entityType: 'USER_PROFILE',
        entityId: args.id,
        details: { fields: changedKeys, email: targetUser.email }
      }
    });
  } catch (auditError) {
    console.error('[AdminUsers] User updated but audit log write failed:', auditError);
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${args.id}/edit`);
  return { success: true };
});

export const deleteUserAction = createSafeAction(async (args: z.infer<typeof deleteUserSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  if (args.id === session.userId) {
    throw new Error('You cannot delete yourself');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: args.id } });
  if (targetUser?.email === 'admin@entertainlawyers.com') {
    throw new Error('The main admin account cannot be deleted.');
  }

  if (!targetUser) throw new Error('User not found');

  try {
    await prisma.user.delete({
      where: { id: args.id }
    });
  } catch (error) {
    if (isRecordInUseError(error)) {
      throw new Error('This user has related sessions, content, payments, entitlements, or logs and cannot be deleted safely. Disable or change their role instead.');
    }
    if (isRecordNotFoundError(error)) throw new Error('User not found');
    throw error;
  }

  revalidatePath('/admin/users');
  return { success: true };
});
