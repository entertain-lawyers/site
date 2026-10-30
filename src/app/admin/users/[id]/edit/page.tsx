import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { Metadata } from 'next';
import UserEditClient from './UserEditClient';

export const metadata: Metadata = {
  title: 'Edit User - Admin',
};

/**
 * WP-parity user profile editor (user-edit screen): Names, Contact Info,
 * About, Profile Picture and Account Management.
 *
 * The extra profile columns (firstName, lastName, nickname, bio, website) are
 * added by migration 20261027150000_add_user_profile_fields. If that migration
 * hasn't run yet (e.g. on production before deploy) we fall back to the base
 * fields so the page doesn't crash.
 */
export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const { id } = await params;

  // Try the full select (post-migration). Fall back to base fields if the new
  // columns don't exist yet so the page stays functional pre-migration.
  let user: {
    id: string;
    email: string;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    nickname?: string | null;
    bio?: string | null;
    website?: string | null;
    image: string | null;
    role: Role;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        nickname: true,
        bio: true,
        website: true,
        image: true,
        role: true,
      },
    });
  } catch {
    // Profile-fields migration not yet applied — load base fields only.
    user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
      },
    });
  }

  if (!user) return notFound();

  // "Display name publicly as" candidates, mirroring the WP dropdown:
  // nickname, first name, first + last, last name, email handle, current name.
  const emailHandle = user.email.split('@')[0];
  const composed = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const displayOptions = Array.from(
    new Set(
      [user.nickname, user.firstName, composed, user.lastName, user.name, emailHandle]
        .map((option) => (option || '').trim() || null)
        .filter((option): option is string => Boolean(option))
    )
  );

  return (
    <UserEditClient
      user={{
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        nickname: user.nickname ?? null,
        bio: user.bio ?? null,
        website: user.website ?? null,
        image: user.image ?? null,
        role: user.role,
      }}
      displayOptions={displayOptions}
    />
  );
}
