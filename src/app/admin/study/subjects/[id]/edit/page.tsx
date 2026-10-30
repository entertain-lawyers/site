import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import SubjectForm from '../../SubjectForm';

interface EditSubjectPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Edit Subject - Admin',
};

export default async function EditSubjectPage({ params }: EditSubjectPageProps) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { id } = await params;

  const [subject, semesters] = await Promise.all([
    prisma.subject.findUnique({
      where: { id },
    }),
    prisma.semester.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, order: true },
    }),
  ]);

  if (!subject) {
    notFound();
  }

  return (
    <SubjectForm
      semesters={semesters}
      initialData={{
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        order: subject.order,
        semesterId: subject.semesterId,
      }}
    />
  );
}
