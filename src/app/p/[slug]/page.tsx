import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Render } from '@measured/puck/rsc';
import { builderConfig } from '@/lib/puck/config';
import type { Data } from '@measured/puck';

/**
 * Public renderer for drag & drop pages built in /admin/pages.
 * Only PUBLISHED documents are visible; drafts 404.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const page = await prisma.builderPage.findUnique({ where: { slug } });
  if (!page || page.status !== 'PUBLISHED') return {};
  return {
    title: page.metaTitle || page.title,
    description: page.metaDesc || undefined,
  };
}

export default async function PublicBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const page = await prisma.builderPage.findUnique({ where: { slug } });
  const published = page && page.status === 'PUBLISHED';
  if (!published || !page) notFound();

  return (
    <main className="pb-16">
      <Render config={builderConfig} data={page.data as Data} />
    </main>
  );
}

export const dynamic = 'force-dynamic';
