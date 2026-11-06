import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

/**
 * Resolve existence before parent/segment loading.tsx Suspense boundaries —
 * `src/app/team/loading.tsx` wraps the detail page. Once a loading fallback
 * streams, the response status is fixed at 200, so a notFound() thrown later
 * by the page would produce a soft 404.
 */
export default async function TeamMemberLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await prisma.teamMember.findUnique({
    where: { slug },
    select: { id: true, isPublished: true },
  });

  if (!member || !member.isPublished) {
    notFound();
  }

  return children;
}
