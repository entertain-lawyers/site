import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { canAccessResource } from '@/modules/entitlements/entitlement.service';
import { studyMaterialLoginUrl } from '@/lib/callback-url';
import { getSecureDocumentUrl } from '@/modules/documents/document.actions';
import dynamic from 'next/dynamic';

const SecurePdfViewer = dynamic(() => import('@/components/SecurePdfViewer'), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-surface-alt animate-pulse">
      <div className="w-16 h-16 border-4 border-border border-t-accent rounded-full animate-spin"></div>
    </div>
  )
});

import StudyOutlineSidebar from '@/components/study/StudyOutlineSidebar';
import { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n';
import { htmlToText } from '@/lib/html';

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

export default async function ReadResourcePage({ params }: { params: Promise<{ resourceId: string }> }) {
  const dict = await getDictionary();
  const { resourceId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(studyMaterialLoginUrl(`/read/${resourceId}`));
  }

  const resource = await prisma.resource.findUnique({
    where: { status: 'PUBLISHED',  id: resourceId },
    include: {
      document: true,
      unit: true,
      subject: {
        include: {
          semester: true,
          units: {
            orderBy: { order: 'asc' },
            include: {
              resources: {
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

  if (!resource) {
    notFound();
  }

  const typedResource = resource as any;

  const hasAccess = await canAccessResource(session.user.id, resourceId);

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
    // Notes created in the admin "Write Note" mode have no PDF; render the
    // stored body instead of telling the reader the document is missing.
    if (resource.content) {
      return (
        <div className="min-h-dvh bg-background transition-colors duration-300">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <Link
              href={`/resources/${resourceId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-accent transition-colors"
            >
              <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
              </svg>
              {dict.goBack}
            </Link>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-navy dark:text-white">
              {resource.title}
            </h1>
            {typedResource.subject?.name && (
              <p className="mt-2 text-sm text-text-muted">
                {typedResource.subject.name}
                {typedResource.subject?.semester?.name
                  ? ` · ${typedResource.subject.semester.name}`
                  : ''}
              </p>
            )}

            <article className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-text-secondary">
              {htmlToText(resource.content)}
            </article>
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
            href={`/resources/${resourceId}`}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent-hover transition-colors shadow-md hover:-translate-y-0.5"
          >
            {dict.goBack}
          </Link>
        </div>
      </div>
    );
  }

  const result = await getSecureDocumentUrl({ resourceId });

  if (!result.success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-surface p-8 rounded-2xl shadow-soft border border-border max-w-md w-full text-center">
          <p className="text-red-600 mb-6 font-medium">{result.error || dict.failedToLoadDocument}</p>
          <Link
            href={`/resources/${resourceId}`}
            className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent-hover transition-colors shadow-md hover:-translate-y-0.5"
          >
            {dict.goBack}
          </Link>
        </div>
      </div>
    );
  }

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

  // Navigation logic
  const allResourcesQuery = await prisma.resource.findMany({
    where: { status: 'PUBLISHED',
      type: resource.type,
      subjectId: resource.subjectId,
      ...(resource.unitId ? { unitId: resource.unitId } : {})
    },
    orderBy: [
      { order: 'asc' },
      { title: 'asc' }
    ],
    select: { id: true, title: true }
  });

  const currentIndex = allResourcesQuery.findIndex(r => r.id === resource.id);
  const prevResource = currentIndex > 0 ? allResourcesQuery[currentIndex - 1] : null;
  const nextResource = currentIndex < allResourcesQuery.length - 1 ? allResourcesQuery[currentIndex + 1] : null;

  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'LAW_NOTE': return dict.catLawNotes;
      case 'CASE_LAW': return dict.catCaseLaws;
      case 'OLD_QUESTION': return dict.catOldQuestions;
      default: return dict.catHistoricalFacts;
    }
  };

  const filteredUnits = typedResource.subject?.units?.map((unit: any) => ({
    ...unit,
    resources: unit.resources.filter((r: any) => r.type === resource.type)
  })) || [];

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden transition-colors duration-300">
      {/* Top Header/Breadcrumb */}
      <div className="h-16 bg-surface border-b border-border flex items-center px-4 shrink-0 shadow-sm z-10 justify-between">
        <div className="flex items-center text-sm">
          <Link
            href={`/resources/${resourceId}`}
            className="text-text-muted hover:text-accent mr-4 transition-colors flex items-center justify-center bg-surface-alt rounded-full w-11 h-11"
            aria-label="Go back to resource details"
            title={dict.goBack}
          >
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
            </svg>
          </Link>
          <div className="flex items-center text-text-muted hidden md:flex font-medium">
            <span>{getResourceTypeLabel(resource.type)}</span>
            <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
            </svg>
            <span>{typedResource.subject?.semester?.name}</span>
            <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
            </svg>
            <span>{typedResource.subject?.name}</span>
            {resource.unit && (
              <>
                <svg className="w-3.5 h-3.5 text-border-strong mx-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span>{resource.unit.name}</span>
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <StudyOutlineSidebar
          units={filteredUnits}
          currentResourceId={resource.id}
          currentUnitId={resource.unitId}
        />

        {/* PDF Viewer Area */}
        <div className="flex-1 relative bg-surface-alt flex flex-col h-full">
          <div className="flex-1 overflow-hidden relative">
            <SecurePdfViewer url={result.data} watermarkLines={watermarkLines} />
          </div>

          {/* Bottom Navigation */}
          <div className="h-16 sm:h-20 bg-surface border-t border-border flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
            {prevResource ? (
              <Link
                href={`/read/${prevResource.id}`}
                className="flex items-center gap-3 text-sm text-text-secondary hover:text-accent font-medium transition-colors group"
              >
                <div className="w-11 h-11 rounded-full bg-surface-alt flex items-center justify-center border border-transparent group-hover:border-accent/30 group-hover:bg-accent/5 transition-all">
                  <svg className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs text-text-muted font-bold tracking-wider uppercase mb-0.5">{dict.previous}</div>
                  <div className="truncate max-w-[200px] font-bold group-hover:text-accent transition-colors">{prevResource.title}</div>
                </div>
              </Link>
            ) : <div />}

            {nextResource ? (
              <Link
                href={`/read/${nextResource.id}`}
                className="flex items-center gap-3 text-sm text-text-secondary hover:text-accent font-medium transition-colors group text-right"
              >
                <div className="hidden sm:block">
                  <div className="text-xs text-text-muted font-bold tracking-wider uppercase mb-0.5">{dict.next}</div>
                  <div className="truncate max-w-[200px] font-bold group-hover:text-accent transition-colors">{nextResource.title}</div>
                </div>
                <div className="w-11 h-11 rounded-full bg-surface-alt flex items-center justify-center border border-transparent group-hover:border-accent/30 group-hover:bg-accent/5 transition-all">
                  <svg className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                  </svg>
                </div>
              </Link>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}
