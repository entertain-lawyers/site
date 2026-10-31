import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import UnitForm from '../../UnitForm';

interface EditUnitPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Edit Unit - Admin',
};

export default async function EditUnitPage({ params }: EditUnitPageProps) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { id } = await params;

  const [unit, subjects] = await Promise.all([
    prisma.unit.findUnique({
      where: { id },
    }),
    prisma.subject.findMany({
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
    }),
  ]);

  if (!unit) {
    notFound();
  }

  return (
    <UnitForm
      subjects={subjects}
      initialData={{
        id: unit.id,
        name: unit.name,
        title: unit.title,
        order: unit.order,
        subjectId: unit.subjectId,
      }}
    />
  );
}
