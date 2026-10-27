import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PageEditorClient from '@/components/admin/PageEditorClient';
import type { Data } from '@measured/puck';
import '@measured/puck/puck.css';

export default async function EditBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const page = await prisma.builderPage.findUnique({ where: { id } });
  if (!page) notFound();

  const initialData = page.data as Data;

  return <PageEditorClient id={page.id} slug={page.slug} initialData={initialData} />;
}
