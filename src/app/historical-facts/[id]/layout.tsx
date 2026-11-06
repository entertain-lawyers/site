import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getPublishedHistoricalFact } from './validate';

/**
 * Resolve existence before the segment's loading.tsx Suspense boundary renders.
 * Once a loading fallback streams, the response status is fixed at 200, so a
 * notFound() thrown later by the page would produce a soft 404.
 */
export default async function HistoricalFactLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fact = await getPublishedHistoricalFact(id);

  if (!fact) {
    notFound();
  }

  return children;
}
