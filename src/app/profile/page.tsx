import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'My Profile - Entertain Lawyers',
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-fluid-h2 font-bold text-navy dark:text-white mb-2">My Profile</h1>
          <p className="text-text-secondary">Manage your personal information and security settings.</p>
        </div>

        <ProfileClient user={{
          id: user.id,
          email: user.email,
          name: user.name ?? '',
          phone: '',
          education: '',
          university: '',
          hasPassword: !!user.passwordHash
        }} />
      </div>
    </div>
  );
}
