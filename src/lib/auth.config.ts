import type { NextAuthConfig } from "next-auth";

// In cloud deployment (Vercel / production host with HTTPS), enable secure cookies.
// On any local instance (development or local production testing), disable secure cookies
// so browsers do not reject session and CSRF cookies over http://localhost.
const isCloudHttpsDeployment =
  Boolean(process.env.VERCEL) ||
  (process.env.NODE_ENV === "production" &&
    Boolean(process.env.AUTH_URL?.startsWith("https://")) &&
    !process.env.AUTH_URL?.includes("localhost"));

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  useSecureCookies: isCloudHttpsDeployment,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as any) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
