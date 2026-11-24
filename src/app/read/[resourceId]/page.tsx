import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { canAccessResource } from '@/modules/entitlements/entitlement.service';
import { studyMaterialLoginUrl } from '@/lib/callback-url';
import ArticleBody from '@/components/posts/ArticleBody';

import dynamic from 'next/dynamic';

const SecurePdfViewer = dynamic(() => import('@/components/SecurePdfViewer'), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-surface-alt animate-pulse">
      <div className="w-16 h-16 border-4 border-border border-t-accent rounded-full animate-spin"></div>
    </div>
  )
});

import StudyOutlineSidebar from '@/components/study/StudyOutlineSidebar';
import MobileStudyOutlineDrawer from '@/components/study/MobileStudyOutlineDrawer';
import { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n';
import AuthorBioTrigger from '@/components/author/AuthorBioTrigger';
import CaseCategoryBadge from '@/components/study/CaseCategoryBadge';
import CaseLawCategoryBadge from '@/components/study/CaseLawCategoryBadge';
import SocialShareToolbar from '@/components/posts/SocialShareToolbar';
import Reactions from '@/components/posts/Reactions';
import Comments from '@/components/posts/Comments';
import LatestPostsSidebar from '@/components/posts/LatestPostsSidebar';
import StudyCurriculumSidebar from '@/components/study/StudyCurriculumSidebar';
import LatestCaseLawsSidebar from '@/components/study/LatestCaseLawsSidebar';
import { getLatestPosts, getLatestNewsPosts } from '@/lib/latest-posts';
import { isPrescribedCasesUnit, getCaseLawCategory } from '@/lib/case-category';
import { ArrowLeft, ChevronRight, FileText, Clock, Scale } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ resourceId: string }> }): Promise<Metadata> {
  const { resourceId } = await params;
  const resource = await prisma.resource.findUnique({
    where: { status: 'PUBLISHED',  id: resourceId },
  });

  if (!resource) notFound();

  return {
    title: `Reading ${resource.title}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ReadResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>;
  searchParams?: Promise<{ from?: string; type?: string; caseLaw?: string }>;
}) {
  const dict = await getDictionary();
  const { resourceId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth();

  if (!session?.user?.id) {
    redirect(studyMaterialLoginUrl(`/read/${resourceId}`));
  }

  type ReadResourceDetail = NonNullable<
    Awaited<
      ReturnType<
        typeof prisma.resource.findUnique<{
          where: { status: 'PUBLISHED'; id: string };
          include: {
            document: true;
            unit: true;
            semester: true;
            author: { select: { name: true; image: true; bio: true; role: true; website: true; email: true } };
            createdBy: { select: { name: true; image: true; bio: true; role: true; website: true; email: true } };
            subject: {
              include: {
                semester: true;
                units: {
                  include: {
                    resources: {
                      select: { id: true; title: true; type: true };
                    };
                  };
                };
              };
            };
          };
        }>
      >
    >
  >;

  let resource: ReadResourceDetail | null = null;
  try {
    resource = await prisma.resource.findUnique({
      where: { status: 'PUBLISHED',  id: resourceId },
      include: {
        document: true,
        unit: true,
        semester: true,
        author: { select: { name: true, image: true, bio: true, role: true, website: true, email: true } },
        createdBy: { select: { name: true, image: true, bio: true, role: true, website: true, email: true } },
        subject: {
          include: {
            semester: true,
            units: {
              orderBy: { order: 'asc' },
              include: {
                resources: {
                  // Drafts and archived resources must not appear in the outline.
                  where: { status: 'PUBLISHED' },
                  orderBy: [
                    { order: 'asc' },
                    { title: 'asc' }
                  ],
                  select: { id: true, title: true, type: true }
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    const { isSpecificMissingColumnError } = await import('@/lib/prisma-errors');
    if (!isSpecificMissingColumnError(error, ['authorId', 'createdById'])) {
      console.error(`[read/${resourceId}] database error loading resource:`, error);
      throw error;
    }

    console.warn(
      `[read/${resourceId}] resource findUnique failed (authorId/createdById migration pending), falling back to base fields:`,
      error
    );

    const fallbackResource = await prisma.resource.findUnique({
      where: { status: 'PUBLISHED', id: resourceId },
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        subjectId: true,
        semesterId: true,
        semester: true,
        unitId: true,
        documentId: true,
        document: true,
        content: true,
        featuredImage: true,
        metaTitle: true,
        unit: true,
        subject: {
          include: {
            semester: true,
            units: {
              orderBy: { order: 'asc' },
              include: {
                resources: {
                  where: { status: 'PUBLISHED' },
                  orderBy: [
                    { order: 'asc' },
                    { title: 'asc' },
                  ],
                  select: { id: true, title: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    resource = fallbackResource
      ? ({
          ...fallbackResource,
          featuredImage: fallbackResource.featuredImage ?? null,
          authorId: null,
          createdById: null,
          order: 0,
          semesterId: fallbackResource.semesterId ?? null,
          semester: fallbackResource.semester ?? null,
          metaDesc: null,
          metaTitle: fallbackResource.metaTitle ?? null,
          isPremium: false,
          priceAmount: null,
          currency: 'NPR',
          author: null,
          createdBy: null,
        } as ReadResourceDetail)
      : null;
  }

  if (!resource) {
    notFound();
  }

  const hasAccess = await canAccessResource(session.user.id, resourceId);

  // Back links go to the study listing: with entitled users now skipping the
  // resource detail page, linking back there would bounce straight here.
  const effectiveSemesterId = resource.semesterId || resource.subject?.semester?.id || resource.subject?.semesterId;
  const semesterName = resource.semester?.name || resource.subject?.semester?.name;

  // Precedent / Case Law mode:
  // 1. Accessed with from='case_law' or type='CASE_LAW' or searchParams.caseLaw
  // 2. OR resource's native type is 'CASE_LAW' AND not explicitly opened from syllabus (from !== 'syllabus')
  const isFromCaseLawListing = Boolean(
    resolvedSearchParams.from === 'case_law' ||
    resolvedSearchParams.type === 'CASE_LAW' ||
    Boolean(resolvedSearchParams.caseLaw)
  );

  const isPrecedentCase = isFromCaseLawListing || (resource.type === 'CASE_LAW' && resolvedSearchParams.from !== 'syllabus');

  // Syllabus Navigator is ONLY kept for law notes and prescribed cases of law notes!
  // Precedent / Case laws must NOT show the syllabus navigator (keep latest posts and case laws instead).
  const hasSyllabus = !isPrecedentCase && Boolean(resource.subject?.units && resource.subject.units.length > 0);

  const rawCaseLawParam = resolvedSearchParams.caseLaw?.toLowerCase();
  const caseCat = getCaseLawCategory(resource);
  const effectiveCaseCategory = rawCaseLawParam || (caseCat ? caseCat.toLowerCase() : null);

  let studyBackUrl = '/study?type=CASE_LAW';
  let studyBackLabel = 'Back to Case Laws';

  if (isPrecedentCase) {
    if (effectiveCaseCategory === 'civil') {
      studyBackUrl = '/study?type=CASE_LAW&caseLaw=civil';
      studyBackLabel = 'Back to Civil Cases';
    } else if (effectiveCaseCategory === 'criminal') {
      studyBackUrl = '/study?type=CASE_LAW&caseLaw=criminal';
      studyBackLabel = 'Back to Criminal Cases';
    } else if (effectiveCaseCategory === 'writ' || effectiveCaseCategory === 'writs') {
      studyBackUrl = '/study?type=CASE_LAW&caseLaw=writ';
      studyBackLabel = 'Back to Writs';
    } else {
      studyBackUrl = '/study?type=CASE_LAW';
      studyBackLabel = 'Back to Case Laws';
    }
  } else {
    // Law note and prescribed cases of law note:
    // Navigates back to the unit or prescribed cases unit of that subject in law notes!
    studyBackLabel = 'Back to Study';
    const studyBackParams = new URLSearchParams();
    if (resource.type) {
      studyBackParams.set('type', resource.type);
    }
    if (effectiveSemesterId) {
      studyBackParams.set('semester', effectiveSemesterId);
    }
    if (resource.subjectId) {
      studyBackParams.set('subject', resource.subjectId);
    }
    if (resource.unitId) {
      studyBackParams.set('unit', resource.unitId);
    }
    studyBackUrl = studyBackParams.toString()
      ? `/study?${studyBackParams.toString()}`
      : '/study';
  }

  const isPrescribedCase =
    resource.type === 'CASE_LAW' ||
    isPrescribedCasesUnit(resource.unit) ||
    isPrescribedCasesUnit(resource.unitId) ||
    Boolean(getCaseLawCategory(resource));

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-surface p-8 rounded-2xl shadow-soft border border-border max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">{dict.accessDenied}</h1>
          <p className="text-text-secondary mb-8">
            {dict.accessDeniedDesc}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/resources/${resourceId}`}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent-hover transition-colors shadow-md hover:-translate-y-0.5"
            >
              {dict.goToResourceDetails}
            </Link>
            <Link
              href="/pricing"
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-border text-sm font-bold rounded-xl text-navy dark:text-white hover:bg-surface-alt transition-colors"
            >
              {dict.viewSubscriptionPlans}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!resource.documentId || !resource.document) {
    // Notes created in the admin "Write Note" mode, and case summaries migrated
    // from WordPress, have no PDF; render the stored body instead of telling
    // the reader the document is missing.
    if (resource.content) {
      const displayAuthor = resource.author ?? resource.createdBy;
      const resourceAuthor = {
        name: displayAuthor?.name || 'Entertain Lawyers',
        image: displayAuthor?.image || null,
        bio: displayAuthor?.bio || 'Entertain Lawyers provides comprehensive law notes, old questions, case laws, and study resources for law students and legal practitioners in Nepal.',
        role: displayAuthor?.role ? (displayAuthor.role === 'ADMIN' ? 'Administrator' : displayAuthor.role === 'EDITOR' ? 'Editor' : 'Contributor') : 'Editorial Team',
        website: displayAuthor?.website || null,
        email: displayAuthor?.email || null,
      };

      const createdDateFormatted = resource.createdAt
        ? new Date(resource.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : null;

      const typeLabel = resource.type === 'CASE_LAW'
        ? 'Case Law'
        : resource.type === 'LAW_NOTE'
        ? 'Law Note'
        : resource.type.replace('_', ' ');

      const [latestPosts, latestNewsPosts, latestCaseLaws] = await Promise.all([
        !hasSyllabus ? getLatestPosts() : Promise.resolve([]),
        !hasSyllabus ? getLatestNewsPosts(undefined, 5) : Promise.resolve([]),
        !hasSyllabus
          ? prisma.resource
              .findMany({
                where: {
                  status: 'PUBLISHED',
                  OR: [
                    { type: 'CASE_LAW' },
                    { unit: { name: { contains: 'prescribed', mode: 'insensitive' } } },
                  ],
                  id: { not: resource.id },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                  id: true,
                  title: true,
                  type: true,
                  createdAt: true,
                  featuredImage: true,
                  metaTitle: true,
                },
              })
              .catch((err) => {
                console.error(`[read/${resourceId}] error loading latest case laws:`, err);
                return [];
              })
          : Promise.resolve([]),
      ]);

      return (
        <div className="min-h-screen bg-background pb-16">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
              <article className="min-w-0">
                {/* Breadcrumb Navigation */}
                <nav aria-label="Breadcrumb" className="mb-4">
                  <ol className="flex items-center space-x-2 text-xs sm:text-sm text-text-muted">
                    <li>
                      <Link href={studyBackUrl} className="hover:text-accent font-medium transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {studyBackLabel}
                      </Link>
                    </li>
                    <li>
                      <ChevronRight className="w-3.5 h-3.5 text-border" />
                    </li>
                    <li className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                      {isPrecedentCase ? 'Case Law' : typeLabel}
                    </li>
                  </ol>
                </nav>

                {/* Content Header */}
                <header className="mb-6 pb-6 border-b border-border">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md bg-accent/10 text-accent border border-accent/20 tracking-wider uppercase">
                      {isPrecedentCase ? <Scale className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      {isPrecedentCase ? 'Case Law' : typeLabel}
                    </span>
                    {getCaseLawCategory(resource) && (
                      <CaseLawCategoryBadge category={getCaseLawCategory(resource)!} size="sm" />
                    )}
                    {resource.metaTitle && (
                      <CaseCategoryBadge category={resource.metaTitle} size="sm" />
                    )}
                    {!isPrecedentCase && (resource.subject?.name || semesterName) && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-alt border border-border text-text-muted">
                        {resource.subject?.name || semesterName}
                      </span>
                    )}
                  </div>

                  <h1 className="text-[clamp(1.85rem,3.4vw,2.75rem)] font-extrabold text-navy dark:text-white leading-[1.2] tracking-tight mb-4 break-words">
                    {resource.title}
                  </h1>

                  {/* Clean Author & Date line matching previous site */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
                    <AuthorBioTrigger author={resourceAuthor} size="sm" showName />
                    {createdDateFormatted && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-text-muted" aria-hidden="true" />
                        <time>{createdDateFormatted}</time>
                      </span>
                    )}
                  </div>
                </header>

                {/* Featured Image */}
                {resource.featuredImage && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-border shadow-xs aspect-[1200/630] w-full bg-slate-100 dark:bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resource.featuredImage}
                      alt={resource.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}

                {/* Article Body - 3 separate boxes/pills for TOC, Share, and Content */}
                <ArticleBody
                  html={resource.content}
                  toc
                  boxed
                  belowToc={<SocialShareToolbar title={resource.title} labels />}
                />

                {/* About Author Section */}
                <section aria-labelledby="read-author-heading" className="bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-xs mb-8">
                  <div className="border-b border-border pb-3 mb-5">
                    <h2 id="read-author-heading" className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      About Author
                    </h2>
                  </div>
                  <div className="flex items-start gap-4 sm:gap-5">
                    <AuthorBioTrigger author={resourceAuthor} size="lg" showName={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <AuthorBioTrigger
                          author={resourceAuthor}
                          showName
                          nameClassName="text-base font-bold text-navy dark:text-white hover:text-accent"
                        >
                          <span className="font-bold text-navy dark:text-white text-base hover:text-accent transition-colors cursor-pointer">
                            {resourceAuthor.name}
                          </span>
                        </AuthorBioTrigger>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                          {resourceAuthor.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                        {resourceAuthor.bio}
                      </p>
                      {resourceAuthor.website && (
                        <a
                          href={resourceAuthor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-xs font-semibold text-accent hover:underline"
                        >
                          {resourceAuthor.website.replace(/^https?:\/\//, '')} &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                </section>

                {/* User Reaction Bar */}
                <Reactions
                  postId={resource.id}
                  postType={resource.type === 'CASE_LAW' ? 'CASELAW' : 'NOTES'}
                  title={resource.type === 'CASE_LAW' ? 'How did this case law make you feel?' : 'How did this note make you feel?'}
                />

                {/* Comments Section */}
                <div className="mt-8">
                  <Comments
                    postId={resource.id}
                    postType={resource.type === 'CASE_LAW' ? 'CASELAW' : 'NOTES'}
                    variant="study"
                  />
                </div>

                {/* Mobile / Tablet: On standalone precedents/notes without a syllabus, show Latest Case Laws and News stacked below comments */}
                {!hasSyllabus && (latestCaseLaws.length > 0 || latestNewsPosts.length > 0 || latestPosts.length > 0) && (
                  <div className="mt-12 lg:hidden space-y-8 border-t border-border pt-8">
                    {latestCaseLaws.length > 0 && (
                      <LatestCaseLawsSidebar cases={latestCaseLaws} currentResourceId={resource.id} />
                    )}
                    {latestNewsPosts.length > 0 ? (
                      <LatestPostsSidebar posts={latestNewsPosts} title="Latest News" />
                    ) : latestPosts.length > 0 ? (
                      <LatestPostsSidebar posts={latestPosts} />
                    ) : null}
                  </div>
                )}
              </article>

              {/* Sidebar on Desktop: Syllabus Navigator for all notes/prescribed cases in a syllabus, or Latest Precedents & News for standalone items */}
              <aside className="hidden lg:block space-y-6 lg:sticky lg:top-24">
                {hasSyllabus ? (
                  <StudyCurriculumSidebar
                    semesterName={semesterName}
                    subjectName={resource.subject?.name}
                    subjectId={resource.subjectId}
                    currentUnitId={resource.unitId}
                    currentResourceId={resource.id}
                    units={resource.subject?.units}
                  />
                ) : (
                  <>
                    {latestCaseLaws.length > 0 && (
                      <LatestCaseLawsSidebar cases={latestCaseLaws} currentResourceId={resource.id} />
                    )}
                    {latestNewsPosts.length > 0 ? (
                      <LatestPostsSidebar posts={latestNewsPosts} title="Latest News" />
                    ) : latestPosts.length > 0 ? (
                      <LatestPostsSidebar posts={latestPosts} />
                    ) : null}
                  </>
                )}
              </aside>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-surface p-8 rounded-2xl shadow-soft border border-border max-w-md w-full text-center">
          <div className="w-16 h-16 bg-surface-alt text-text-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">{dict.pdfNotAvailable}</h1>
          <p className="text-text-secondary mb-8">
            {dict.pdfNotAvailableDesc}
          </p>
          <Link
            href={studyBackUrl}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent-hover transition-colors shadow-md hover:-translate-y-0.5"
          >
            {dict.goBack}
          </Link>
        </div>
      </div>
    );
  }

  // Same-origin stream: pdf.js fetches this from the browser, so a presigned
  // B2 URL (bucket CORS + 5-minute expiry) broke every PDF in production.
  const pdfUrl = `/api/documents/${resourceId}/pdf`;

  // Generate dynamic watermark data
  const userIdentifier = session.user.email || 'Entertain Lawyers Member';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Create a pseudo-hash for the session to add tracing without exposing pure IDs
  const rawSessionString = `${session.user.id}-${resourceId}-${now.getTime()}`;
  let hash = 0;
  for (let i = 0; i < rawSessionString.length; i++) {
    hash = ((hash << 5) - hash) + rawSessionString.charCodeAt(i);
    hash |= 0;
  }
  const sessionHash = Math.abs(hash).toString(16).toUpperCase().substring(0, 6).padStart(6, '0');

  const watermarkLines = [
    'ENTERTAIN LAWYERS',
    userIdentifier,
    `${dateStr} • ${timeStr}`,
    `Resource: ${resource.title.substring(0, 30)}`,
    `Session: ${sessionHash}`
  ];

  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'LAW_NOTE': return dict.catLawNotes;
      case 'CASE_LAW': return dict.catCaseLaws;
      case 'OLD_QUESTION': return dict.catOldQuestions;
      default: return dict.catHistoricalFacts;
    }
  };

  const filteredUnits = resource.subject?.units?.map((unit) => ({
    ...unit,
    resources: unit.resources.filter((r) => r.type === resource.type)
  })) || [];

  return (
    <div className="h-[calc(100dvh-44px)] flex flex-col bg-background overflow-hidden transition-colors duration-300">
      {/* Top Header/Breadcrumb */}
      <div className="h-11 bg-surface border-b border-border flex items-center px-3 shrink-0 shadow-sm z-10 justify-between">
        <div className="flex items-center text-sm">
          <Link
            href={studyBackUrl}
            className="text-text-muted hover:text-accent mr-3 transition-colors flex items-center justify-center bg-surface-alt hover:bg-surface-alt/80 rounded-full w-8 h-8 min-h-[36px] min-w-[36px]"
            aria-label={studyBackLabel}
            title={studyBackLabel}
          >
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
            </svg>
          </Link>
          <div className="flex items-center text-text-muted hidden md:flex font-medium">
            <Link
              href={studyBackUrl}
              className="hover:text-accent transition-colors"
            >
              {isPrecedentCase ? 'Case Laws' : getResourceTypeLabel(resource.type)}
            </Link>
            {isPrecedentCase ? (
              effectiveCaseCategory && (
                <>
                  <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                  </svg>
                  <Link
                    href={studyBackUrl}
                    className="hover:text-accent transition-colors capitalize"
                  >
                    {effectiveCaseCategory}
                  </Link>
                </>
              )
            ) : (
              <>
                {resource.type === 'CASE_LAW' && (
                  <span className="ml-2">
                    <CaseCategoryBadge category={resource.metaTitle} size="sm" />
                  </span>
                )}
                {semesterName && (
                  <>
                    <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <Link
                      href={effectiveSemesterId ? `/study?type=${resource.type}&semester=${effectiveSemesterId}` : `/study?type=${resource.type}`}
                      className="hover:text-accent transition-colors"
                    >
                      {semesterName}
                    </Link>
                  </>
                )}
                {resource.subject?.name && (
                  <>
                    <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <Link
                      href={`/study?type=${resource.type}${effectiveSemesterId ? `&semester=${effectiveSemesterId}` : ''}&subject=${resource.subjectId}`}
                      className="hover:text-accent transition-colors"
                    >
                      {resource.subject.name}
                    </Link>
                  </>
                )}
                {resource.unit?.name && (
                  <>
                    <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <Link
                      href={`/study?type=${resource.type}${effectiveSemesterId ? `&semester=${effectiveSemesterId}` : ''}&subject=${resource.subjectId}&unit=${resource.unitId}`}
                      className="hover:text-accent transition-colors"
                    >
                      {resource.unit.name}
                    </Link>
                  </>
                )}
              </>
            )}
            <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
            </svg>
          </div>
          <h1 className="text-sm font-bold text-navy dark:text-white truncate max-w-[160px] sm:max-w-[200px] md:max-w-md ml-0 md:ml-1">
            {resource.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {hasSyllabus && filteredUnits.length > 0 && (
            <MobileStudyOutlineDrawer
              units={filteredUnits}
              currentResourceId={resource.id}
              currentUnitId={resource.unitId}
            />
          )}
          {(() => {
            const displayAuthor = resource.author ?? resource.createdBy;
            const resourceAuthor = {
              name: displayAuthor?.name || 'Entertain Lawyers',
              image: displayAuthor?.image || null,
              bio: displayAuthor?.bio || 'Entertain Lawyers provides comprehensive law notes, old questions, case laws, and study resources for law students and legal practitioners in Nepal.',
              role: displayAuthor?.role ? (displayAuthor.role === 'ADMIN' ? 'Administrator' : displayAuthor.role === 'EDITOR' ? 'Editor' : 'Contributor') : 'Editorial Team',
              website: displayAuthor?.website || null,
              email: displayAuthor?.email || null,
            };
            return (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-bold text-text-muted uppercase tracking-wider">{dict.author}:</span>
                <AuthorBioTrigger author={resourceAuthor} size="xs" showName />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - desktop-only syllabus outline for notes and prescribed cases */}
        {hasSyllabus && filteredUnits.length > 0 && (
          <div className="hidden lg:flex h-full shrink-0">
            <StudyOutlineSidebar
              units={filteredUnits}
              currentResourceId={resource.id}
              currentUnitId={resource.unitId}
            />
          </div>
        )}

        {/* PDF Viewer Area */}
        <div className="flex-1 relative bg-surface-alt flex flex-col h-full">
          <div className="flex-1 overflow-hidden relative">
            <SecurePdfViewer url={pdfUrl} watermarkLines={watermarkLines} />
          </div>
        </div>
      </div>
    </div>
  );
}
