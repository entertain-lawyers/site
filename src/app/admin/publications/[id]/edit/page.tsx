import { prisma } from '@/lib/prisma';
import EditPubClient from './EditPubClient';
import { notFound } from 'next/navigation';

export default async function EditPubPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const pub = await prisma.publication.findUnique({ where: { id } });
  if (!pub) notFound();
  return <EditPubClient pub={pub} />;
}
