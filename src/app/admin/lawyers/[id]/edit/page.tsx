import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import LawyerFormClient from '../../LawyerFormClient';

export const metadata = { title: 'Edit Consultation Lawyer | Admin' };

export default async function EditLawyerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lawyer = await prisma.consultationLawyer.findUnique({
    where: { id },
  });

  if (!lawyer) {
    notFound();
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-navy dark:text-white tracking-tight">
          Edit Advocate Profile
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Update credentials, practice specializations, and direct client contact channels for{' '}
          <strong>{lawyer.name}</strong>.
        </p>
      </div>

      <LawyerFormClient lawyer={lawyer} />
    </div>
  );
}
