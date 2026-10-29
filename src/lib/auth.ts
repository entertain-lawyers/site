import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { authConfig } from "./auth.config";
import { normalizeEmail } from "./auth-utils";
import { rateLimit } from "./rate-limit";
import { getClientIp } from "./client-ip";

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

  // Select explicitly instead of loading the whole row. Prisma's default
  // selection includes every column in the schema, so a database that has not
  // yet applied the profile-fields migration (firstName, lastName, nickname,
  // bio, website) makes this query throw P2022 and login fails with a generic
  // "Configuration" error. Only these base columns are needed to authenticate.
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      isEmailVerified: true,
      emailVerified: true,
    },
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

class LoginRateLimited extends CredentialsSignin {
  code = "LoginRateLimited";
}

/**
 * Credentials login is reachable from /api/auth/*, which the proxy does not
 * cover, so it needs its own throttle. Limit per account (5-10 guesses) and
 * per IP (shared NAT) to slow down password spraying.
 */
async function authorizeWithRateLimit(credentials: unknown) {
  const parsed = credentialsSchema.safeParse(credentials);
  const email = parsed.success ? normalizeEmail(parsed.data.email) : "unknown";

  try {
    const headersList = await headers();
    const ip = getClientIp(headersList);

    const [ipLimit, accountLimit] = await Promise.all([
      rateLimit(`login:ip:${ip}`, 30, 900),
      rateLimit(`login:account:${email}`, 10, 900),
    ]);

    if (!ipLimit.success || !accountLimit.success) {
      throw new LoginRateLimited(
        "Too many login attempts. Please wait a few minutes and try again."
      );
    }
  } catch (err) {
    if (err instanceof LoginRateLimited) {
      throw err;
    }
    console.warn("[auth] Rate limiter check failed, proceeding to authorize:", err);
  }

  return testAuthorize(credentials);
}

export { authConfig };

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, sessionVersion: true },
          });
          token.role = dbUser?.role ?? user.role;
          token.sessionVersion = dbUser?.sessionVersion ?? 0;
        } catch (err) {
          console.warn("[auth] Failed to read user sessionVersion on signin, using user.role fallback:", err);
          token.role = user.role;
          token.sessionVersion = 0;
        }
        return token;
      }

      if (!token.id) return token;

      // Read the role and session version on every request so demotions take
      // effect immediately and a password change invalidates older tokens.
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, sessionVersion: true },
        });

        if (!dbUser) {
          return null;
        }

        // Only invalidate if both sides have explicit non-matching session versions
        if (
          typeof dbUser.sessionVersion === "number" &&
          typeof token.sessionVersion === "number" &&
          dbUser.sessionVersion !== token.sessionVersion
        ) {
          return null;
        }

        token.role = dbUser.role ?? token.role;
        return token;
      } catch (err) {
        console.warn("[auth] Failed to refresh user session from DB, keeping token:", err);
        return token;
      }
    },
  },
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
      authorize: authorizeWithRateLimit,
    }),
  ],
});
