import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

async function publishedResourceExists(id: string): Promise<boolean> {
  try {
    const resource = await prisma.resource.findUnique({
      where: { status: 'PUBLISHED', id },
      select: { id: true },
    });
    return Boolean(resource);
  } catch (error) {
    // A malformed id can fail the database UUID cast; treat it as missing
    // rather than turning a bad URL into a 500.
    if ((error as { code?: string })?.code === 'P2023') {
      return false;
    }
    throw error;
  }
}

/**
 * Resolve existence before the segment's loading.tsx Suspense boundary renders.
 * Once a loading fallback streams, the response status is fixed at 200, so a
 * notFound() thrown later by the page would produce a soft 404.
 */
export default async function ResourceDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await publishedResourceExists(id))) {
    notFound();
  }

  return children;
}
