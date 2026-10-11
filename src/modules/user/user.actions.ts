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

    const parsed = updateProfileSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid profile data");
    }

    // NOTE: The User model currently only has a `name` column. `phone`,
    // `education`, and `university` are accepted from the form but cannot be
    // persisted until the pending additive migration adds those columns.
    // Passing them to Prisma would throw "Unknown argument", so only `name`
    // is written. See docs/OPENCODE_PROGRESS.md (profile fields migration).
    const updated = await prisma.user.update({
      where: { id: ctx.userId },
      data: parsed.data.name !== undefined ? { name: parsed.data.name } : {},
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
