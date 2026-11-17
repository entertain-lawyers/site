import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/lib/i18n';
import { Library } from 'lucide-react';

import { unstable_cache } from 'next/cache';
import { RESOURCES_CACHE_TAG } from '@/lib/cache-tags';
import { RESOURCES_PAGE_SIZE, parseResourcePage } from './pagination';
import ResourcesListSkeleton from './ResourcesListSkeleton';
import { ResourcesList } from './ResourcesList';

export const revalidate = 60;

const getCachedResourceCount = unstable_cache(
  async () => prisma.resource.count({ where: { status: 'PUBLISHED' } }),
  ['public-resources-count'],
  { revalidate: 60, tags: [RESOURCES_CACHE_TAG] }
);

type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const dict = await getDictionary();
  const page = parseResourcePage((await searchParams).page);
  if (page === null) {
    return {
      title: `${dict.resources} — Not Found`,
      robots: { index: false },
    };
  }
  // Only the first page is canonical; deeper pages stay out of indexes so the
  // paginated URLs do not compete with /resources.
  if (page > 1) {
    return {
      title: `${dict.resources} (page ${page})`,
      robots: { index: false },
    };
  }
  return {
    title: `${dict.resources}`,
    description: 'Browse all available study resources, law notes, old questions, and case laws.',
    alternates: { canonical: '/resources' },
  };
}

export default async function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const dict = await getDictionary();
  const pageNumber = parseResourcePage((await searchParams).page);

  // Reject malformed, negative, decimal, or extreme out-of-range page numbers
  // with a real 404 before any content streams.
  if (pageNumber === null) {
    notFound();
  }

  // Resolve the page's existence before rendering the Suspense boundary below.
  // Once a loading fallback flushes, the HTTP status is fixed at 200, so this
  // check must happen up front rather than inside the streamed list.
  const totalCount = await getCachedResourceCount();
  const totalPages = Math.max(1, Math.ceil(totalCount / RESOURCES_PAGE_SIZE));
  if (pageNumber > totalPages) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-accent">
              <Library className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-navy dark:text-white tracking-tight">{dict.resources}</h1>
              <p className="text-lg text-text-secondary mt-1">{dict.studyMaterialsDesc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense fallback={<ResourcesListSkeleton />}>
          <ResourcesList pageNumber={pageNumber} dict={dict} />
        </Suspense>
      </div>
    </div>
  );
}
