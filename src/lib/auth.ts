import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

  if (passwordsMatch) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
  return null;
}

export const authConfig = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: testAuthorize,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        session.user.id = token.id as string;
      }
      // Refresh the role from the database to ensure we never trust stale session data
      if (session.user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
