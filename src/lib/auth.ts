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
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const dummyHash = "$2b$12$dummyHashToPreventTimingAttacks12345678901234567890";

  const passwordsMatch = await bcrypt.compare(
    password,
    user?.passwordHash || dummyHash
  );

  class UserNotFound extends CredentialsSignin { code = "UserNotFound" }
  class MissingPasswordHash extends CredentialsSignin { code = "MissingPasswordHash" }
  class PasswordMismatch extends CredentialsSignin { code = "PasswordMismatch" }
  class UnverifiedEmail extends CredentialsSignin { code = "UnverifiedEmail" }

  if (!user) {
    throw new UserNotFound("User not found in database.");
  }
  
  if (!user.passwordHash) {
    throw new MissingPasswordHash("Password hash is missing for this user.");
  }

  if (!user.isEmailVerified && !user.emailVerified && user.role !== 'ADMIN') {
    throw new UnverifiedEmail('Please verify your email address before logging in.');
  }

  if (passwordsMatch) {
    return { id: user.id, email: user.email, role: user.role };
  }

  throw new PasswordMismatch("Invalid email or password.");
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
