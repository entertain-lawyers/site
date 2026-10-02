'use server';

import { createSafeAction } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  university: z.string().optional().nullable(),
});

export const updateProfile = createSafeAction(
  async (data: z.infer<typeof updateProfileSchema>, ctx) => {
    if (!ctx.userId) throw new Error("Unauthorized");

    const user = await prisma.user.update({
      where: { id: ctx.userId },
      data,
    });

    return { success: true };
  }
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePassword = createSafeAction(
  async ({ currentPassword, newPassword }: z.infer<typeof changePasswordSchema>, ctx) => {
    if (!ctx.userId) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId }
    });

    if (!user || !user.passwordHash) {
      throw new Error("User not found or uses OAuth");
    }

    const passwordsMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordsMatch) {
      throw new Error("Incorrect current password");
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { passwordHash }
    });

    return { success: true };
  }
);
