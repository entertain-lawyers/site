import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function testAuthorize(credentials: any) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Dummy hash to prevent timing attacks on non-existent users
  const dummyHash = "$2b$12$dummyHashToPreventTimingAttacks12345678901234567890";

  const passwordsMatch = await bcrypt.compare(
    password,
    user?.passwordHash || dummyHash
  );

  if (!user || !user.passwordHash) {
    return null;
  }

  class UnverifiedEmail extends CredentialsSignin {
    code = "UnverifiedEmail"
  }

  if (!user.isEmailVerified) {
    throw new UnverifiedEmail('Please verify your email address before logging in.');
  }

  if (passwordsMatch) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
  return null;
}

export { authConfig };

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.AUTH_GOOGLE_ID
      ? [GoogleProvider({
        })]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: testAuthorize,
    }),
  ],
});
