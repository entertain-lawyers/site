import { prisma } from '@/lib/prisma';
import EditFaqClient from './EditFaqClient';
import { notFound } from 'next/navigation';

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const faq = await prisma.fAQ.findUnique({ where: { id } });
  if (!faq) notFound();
  return <EditFaqClient faq={faq} />;
}
