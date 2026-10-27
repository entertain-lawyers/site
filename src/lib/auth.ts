import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { normalizeEmail } from "./auth-utils";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const googleProviderEnabled = Boolean(googleClientId && googleClientSecret);

export async function testAuthorize(credentials: unknown) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // A valid bcrypt hash (60 chars) keeps the compare cost identical when the
  // account does not exist, so response timing does not reveal valid emails.
  const dummyHash = "$2b$12$BC2HnljaAVW2CnR34dTYg.lctzpDZY.ZWCkkT4qR7gI3Z8AbV8TMq";

  const passwordsMatch = await bcrypt.compare(
    password,
    user?.passwordHash || dummyHash
  );

  class UnverifiedEmail extends CredentialsSignin { code = "UnverifiedEmail" }

  // Return null for unknown accounts and wrong passwords: NextAuth shows the
  // same generic error either way, so the UI cannot be used to enumerate users.
  if (!user || !user.passwordHash || !passwordsMatch) {
    return null;
  }

  if (!user.isEmailVerified && !user.emailVerified && user.role !== 'ADMIN') {
    throw new UnverifiedEmail('Please verify your email address before logging in.');
  }

  return { id: user.id, email: user.email, role: user.role };
}

export { authConfig };

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(googleProviderEnabled
      ? [GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
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
