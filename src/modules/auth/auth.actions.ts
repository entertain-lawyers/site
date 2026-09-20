"use server";

import { createSafeAction } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const register = createSafeAction(
  async ({ email, password }: z.infer<typeof registerSchema>) => {
    const parsed = registerSchema.safeParse({ email, password });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid registration data");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      throw new Error("Email is already in use");
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(parsed.data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
      },
    });

    return { id: user.id, email: user.email };
  },
  {
    rateLimitKey: "auth_register",
    rateLimitMax: 5,
    rateLimitWindow: 3600, // 5 per hour
  }
);
