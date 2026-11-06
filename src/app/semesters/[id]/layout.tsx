import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

async function semesterExists(id: string): Promise<boolean> {
  try {
    const semester = await prisma.semester.findUnique({
      where: { id },
      select: { id: true },
    });
    return Boolean(semester);
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
export default async function SemesterLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await semesterExists(id))) {
    notFound();
  }

  return children;
}
