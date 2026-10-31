'use server';

import { createSafeAction, UserFacingError } from "@/lib/safe-action";
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

    const parsed = updateProfileSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid profile data");
    }

    const updated = await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        ...(parsed.data.education !== undefined ? { education: parsed.data.education } : {}),
        ...(parsed.data.university !== undefined ? { university: parsed.data.university } : {}),
      },
      select: { name: true },
    });

    return { success: true, name: updated.name };
  }
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePassword = createSafeAction(
  async ({ currentPassword, newPassword }: z.infer<typeof changePasswordSchema>, ctx) => {
    if (!ctx.userId) throw new Error("Unauthorized");

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid password data");
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new Error("User not found or uses OAuth");
    }

    const passwordsMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordsMatch) {
      throw new UserFacingError("Incorrect current password");
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } }
    });

    return { success: true };
  }
);
