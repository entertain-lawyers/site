import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import SubjectForm from '../SubjectForm';

export const metadata: Metadata = {
  title: 'Create Subject - Admin',
};

export default async function NewSubjectPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true, order: true },
  });

  return <SubjectForm semesters={semesters} />;
}
