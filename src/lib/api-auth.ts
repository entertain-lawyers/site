import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Resolve the signed-in user and their *current* role from the database.
 *
 * JWT sessions embed the role at sign-in time and live for 30 days. Reading
 * `session.user.role` directly means a demoted or deleted admin keeps their
 * access until the token expires, so API routes must call this instead.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  return user ?? null;
}

/**
 * Resolve the current user and require one of `roles`.
 * Returns `null` when the caller is anonymous, deleted, or lacks the role.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles.length > 0 && !roles.includes(user.role)) return null;
  return user;
}
