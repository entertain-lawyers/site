import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { Dictionary } from '@/lib/i18n';
import { BookOpen, ChevronRight, Lock, Library, Clock } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { RESOURCES_CACHE_TAG } from '@/lib/cache-tags';
import { RESOURCES_PAGE_SIZE } from './pagination';
import AuthorBioTrigger from '@/components/author/AuthorBioTrigger';
import CaseCategoryBadge from '@/components/study/CaseCategoryBadge';
import CaseLawCategoryBadge from '@/components/study/CaseLawCategoryBadge';
import { getCaseLawCategory } from '@/lib/case-category';

export const getCachedResources = unstable_cache(
  async (page: number) => {
    return prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * RESOURCES_PAGE_SIZE,
      take: RESOURCES_PAGE_SIZE + 1,
      select: {
        id: true,
        title: true,
        type: true,
        metaTitle: true,
        isPremium: true,
        semester: {
          select: { name: true }
        },
        subject: {
          select: {
            name: true,
            semester: {
              select: { name: true }
            }
          }
        },
        author: {
          select: {
            name: true,
            image: true,
            bio: true,
            role: true,
          }
        },
        createdBy: {
          select: {
            name: true,
            image: true,
            bio: true,
            role: true,
          }
        }
      }
    });
  },
  ['public-resources-list'],
  { revalidate: 3600, tags: [RESOURCES_CACHE_TAG] }
);

export async function ResourcesList({
  pageNumber,
  dict,
}: {
  pageNumber: number;
  dict: Dictionary;
}) {
  const rows = await getCachedResources(pageNumber);
  const hasNextPage = rows.length > RESOURCES_PAGE_SIZE;
  const resources = rows.slice(0, RESOURCES_PAGE_SIZE);

  return (
    <>
      {resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => {
            const subjectName = resource.subject?.name || dict.subject;
            const semesterName = resource.semester?.name || resource.subject?.semester?.name || dict.semester;
            const authorUser = resource.author ?? resource.createdBy;
            const resourceAuthor = {
              name: authorUser?.name || 'Entertain Lawyers',
              image: authorUser?.image || null,
              bio: authorUser?.bio || 'Entertain Lawyers provides comprehensive law notes, old questions, case laws, and study resources for law students and legal practitioners in Nepal.',
              role: authorUser?.role ? (authorUser.role === 'ADMIN' ? 'Administrator' : authorUser.role === 'EDITOR' ? 'Editor' : 'Contributor') : 'Editorial Team',
            };

            const isCaseLaw = resource.type === 'CASE_LAW' || Boolean(getCaseLawCategory(resource));

            return (
              <div
                key={resource.id}
                className="group relative flex flex-col justify-between h-full p-6 bg-surface border border-border rounded-2xl hover:border-accent hover:shadow-soft transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isCaseLaw && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-alt rounded-md text-xs font-semibold text-text-secondary border border-border">
                        <Clock className="w-3.5 h-3.5" />
                        {semesterName}
                      </span>
                    )}
                    {isCaseLaw && (
                      <>
                        <CaseCategoryBadge category={resource.metaTitle} size="sm" />
                        {getCaseLawCategory(resource) && (
                          <CaseLawCategoryBadge category={getCaseLawCategory(resource)!} size="sm" />
                        )}
                      </>
                    )}
                  </div>
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
                  <Link href={`/resources/${resource.id}`} className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {resource.title}
                  </Link>
                </h2>

                <div className="mt-auto space-y-4">
                  {!isCaseLaw && (
                    <div className="flex items-start gap-2 text-sm text-text-secondary">
                      <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-muted" />
                      <span className="line-clamp-1">{subjectName}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border flex justify-between items-center group-hover:border-accent/30 transition-colors">
                    <AuthorBioTrigger author={resourceAuthor} size="xs" showName />
                    <div className="flex items-center gap-1 text-sm font-bold text-accent">
                      <span>{isCaseLaw ? 'Read Case' : (dict.readMore || 'Read More')}</span>
                      <ChevronRight className="w-4 h-4 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </div>
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
    </>
  );
}
