import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import SemesterForm from '../SemesterForm';

export const metadata: Metadata = {
  title: 'Create Semester - Admin - Entertain Lawyers',
};

export default async function NewSemesterPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  return <SemesterForm />;
}
