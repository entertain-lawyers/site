import { prisma } from '@/lib/prisma';
import EditEventClient from './EditEventClient';
import { notFound } from 'next/navigation';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const evt = await prisma.event.findUnique({ where: { id } });
  if (!evt) notFound();
  return <EditEventClient evt={evt} />;
}
