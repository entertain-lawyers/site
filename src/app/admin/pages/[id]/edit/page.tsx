import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Data } from '@measured/puck';
import '@measured/puck/puck.css';

const PageEditorClient = dynamic(() => import('@/components/admin/PageEditorClient'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  ),
});

export default async function EditBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const page = await prisma.builderPage.findUnique({ where: { id } });
  if (!page) notFound();

  const initialData = page.data as Data;

  return <PageEditorClient id={page.id} slug={page.slug} initialData={initialData} />;
}
