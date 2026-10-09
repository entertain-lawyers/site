import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import TeamMemberFormClient from '../../TeamMemberFormClient';

export const metadata = { title: 'Edit Team Member | Admin' };

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await prisma.teamMember.findUnique({
    where: { id },
  });

  if (!member) return notFound();

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy dark:text-white">Edit Team Member</h1>
        <p className="text-text-secondary mt-1">Update {member.name}'s profile information.</p>
      </div>
      <TeamMemberFormClient member={member} />
    </div>
  );
}
