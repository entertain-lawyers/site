'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

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

  const updateData: any = {};

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

  await prisma.user.update({
    where: { id: args.id },
    data: updateData
  });

  revalidatePath('/admin/users');
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

  await prisma.user.delete({
    where: { id: args.id }
  });

  revalidatePath('/admin/users');
  return { success: true };
});
