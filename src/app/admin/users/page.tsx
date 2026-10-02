import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import UsersClient from './UsersClient';
import { Role } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Manage Users - Admin - Entertain Lawyers',
};

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    }
  });

  return (
    <div className="min-h-screen bg-transparent py-10 max-w-[1400px] mx-auto">
      <div className="px-4 sm:px-6 lg:px-8">
        <UsersClient initialUsers={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
