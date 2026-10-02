import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import UnitForm from '../UnitForm';

export const metadata: Metadata = {
  title: 'Create Unit - Admin - Entertain Lawyers',
};

export default async function NewUnitPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const subjects = await prisma.subject.findMany({
    orderBy: [
      { semester: { order: 'asc' } },
      { order: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      semester: {
        select: {
          name: true,
        },
      },
    },
  });

  return <UnitForm subjects={subjects} />;
}
