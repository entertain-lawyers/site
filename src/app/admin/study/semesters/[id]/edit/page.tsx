import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import SemesterForm from '../../SemesterForm';

interface EditSemesterPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Edit Semester - Admin',
};

export default async function EditSemesterPage({ params }: EditSemesterPageProps) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { id } = await params;

  const semester = await prisma.semester.findUnique({
    where: { id },
  });

  if (!semester) {
    notFound();
  }

  return (
    <SemesterForm
      initialData={{
        id: semester.id,
        name: semester.name,
        slug: semester.slug,
        order: semester.order,
      }}
    />
  );
}
