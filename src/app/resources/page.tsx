import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/lib/i18n';
import { BookOpen, ChevronRight, Lock, Library, Clock } from 'lucide-react';

import { unstable_cache } from 'next/cache';
import { RESOURCES_CACHE_TAG } from '@/lib/cache-tags';
import { RESOURCES_PAGE_SIZE, parseResourcePage } from './pagination';

export const revalidate = 60;

const getCachedResources = unstable_cache(
  async (page: number) => {
    return prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { id: 'desc' },
      skip: (page - 1) * RESOURCES_PAGE_SIZE,
      take: RESOURCES_PAGE_SIZE + 1,
      select: {
        id: true,
        title: true,
        isPremium: true,
        subject: {
          select: {
            name: true,
            semester: {
              select: { name: true }
            }
          }
        }
      }
    });
  },
  ['public-resources-list'],
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
  // with a real 404 before issuing any database query.
  if (pageNumber === null) {
    notFound();
  }

  const rows = await getCachedResources(pageNumber);
  const hasNextPage = rows.length > RESOURCES_PAGE_SIZE;
  const resources = rows.slice(0, RESOURCES_PAGE_SIZE);

  // A page number every published resource has been walked past does not
  // exist: render a real 404 instead of an empty "coming soon" catalogue,
  // which previously made the whole section look unavailable.
  if (pageNumber > 1 && resources.length === 0) {
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
        {resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => {
              const subjectName = resource.subject?.name || dict.subject;
              const semesterName = resource.subject?.semester?.name || dict.semester;
              
              return (
                <Link 
                  key={resource.id} 
                  href={`/resources/${resource.id}`}
                  className="group flex flex-col justify-between h-full p-6 bg-surface border border-border rounded-2xl hover:border-accent hover:shadow-soft transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-alt rounded-md text-xs font-semibold text-text-secondary border border-border">
                      <Clock className="w-3.5 h-3.5" />
                      {semesterName}
                    </span>
                    {resource.isPremium ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-gold/10 text-gold-dark border border-gold/20">
                        <Lock className="w-3 h-3" />
                        {dict.premium}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        {dict.free}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-lg font-bold text-navy dark:text-white group-hover:text-accent transition-colors mb-3 line-clamp-2">
                    {resource.title}
                  </h2>
                  
                  <div className="mt-auto space-y-4">
                    <div className="flex items-start gap-2 text-sm text-text-secondary">
                      <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-muted" />
                      <span className="line-clamp-1">{subjectName}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-border flex justify-between items-center group-hover:border-accent/30 transition-colors">
                      <span className="text-sm font-bold text-accent">
                        {dict.readMore || 'Read More'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-5 text-text-muted">
              <Library className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">{dict.noResourcesFound}</h3>
            <p className="text-text-secondary text-base">{dict.resourcesComingSoon}</p>
          </div>
        )}

        {(pageNumber > 1 || hasNextPage) && (
          <nav aria-label="Resource pages" className="mt-10 flex items-center justify-center gap-3 text-sm font-semibold">
            {pageNumber > 1 && (
              <Link
                href={`/resources?page=${pageNumber - 1}`}
                className="px-4 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-text-secondary">Page {pageNumber}</span>
            {hasNextPage && (
              <Link
                href={`/resources?page=${pageNumber + 1}`}
                className="px-4 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent transition-colors"
              >
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
