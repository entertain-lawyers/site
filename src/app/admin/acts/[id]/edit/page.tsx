import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ActForm from '../../ActForm';

export default async function EditActPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { id } = await params;
  const act = await prisma.actLaw.findUnique({
    where: { id },
  });

  if (!act) {
    notFound();
  }

  return <ActForm initialData={act} isEdit={true} />;
}
