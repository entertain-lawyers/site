import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { Metadata } from 'next';
import UserEditClient from './UserEditClient';

export const metadata: Metadata = {
  title: 'Edit User - Admin - Entertain Lawyers',
};

/**
 * WP-parity user profile editor (user-edit screen): Names, Contact Info,
 * About, Profile Picture and Account Management.
 */
export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
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
      createdAt: true,
    },
  });

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
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        bio: user.bio,
        website: user.website,
        image: user.image,
        role: user.role,
      }}
      displayOptions={displayOptions}
    />
  );
}
