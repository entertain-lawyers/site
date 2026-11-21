import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TeamMemberFormClient from '../TeamMemberFormClient';

export const metadata = { title: 'Add Team Member | Admin' };

export default async function NewTeamMemberPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy dark:text-white">Add Team Member</h1>
        <p className="text-text-secondary mt-1">Create a new profile for the public team directory.</p>
      </div>
      <TeamMemberFormClient />
    </div>
  );
}
