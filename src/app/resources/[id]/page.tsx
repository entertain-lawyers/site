import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { canAccessResource, requiresSignIn } from '@/modules/entitlements/entitlement.service';
import { CheckoutButtons } from '@/components/payments/CheckoutButtons';
import { env } from '@/env';
import { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n';
import { BookOpen, FileText, Lock, ChevronLeft, ChevronRight, LockOpen } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({
    where: { status: 'PUBLISHED',  id },
    include: { subject: true }
  });

  if (!resource) return { title: 'Resource Not Found' };

  let descriptionText = "Study materials, notes, and case laws";
  if (resource.type === 'LAW_NOTE') descriptionText = "Comprehensive notes";
  else if (resource.type === 'CASE_LAW') descriptionText = "Precedent case laws and summaries";
  else if (resource.type === 'OLD_QUESTION') descriptionText = "Past examination questions";

  return {
    title: `${resource.title}`,
    description: `${descriptionText} for ${(resource as any).subject?.name}`,
    robots: { index: false },
    openGraph: {
      title: `${resource.title}`,
      description: `${descriptionText} for ${(resource as any).subject?.name}`,
      url: `https://www.entertainlawyers.com/resources/${id}`,
    },
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const dict = await getDictionary();
  const { id } = await params;
  const session = await auth();

  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'LAW_NOTE': return dict.catLawNotes;
      case 'CASE_LAW': return dict.catCaseLaws;
      case 'OLD_QUESTION': return dict.catOldQuestions;
      default: return dict.catHistoricalFacts;
    }
  };

  const resource = await prisma.resource.findUnique({
    where: { status: 'PUBLISHED',  id },
    include: {
      subject: {
        include: {
          semester: true
        }
      },
      unit: true
    }
  });

  if (!resource) {
    notFound();
  }

  // RBAC: sign-in gate — Law Notes, Case Laws and Old Questions require
  // authentication before the content page is served. Anonymous visitors are
  // asked to sign in and are returned here after login.
  if (!session?.user && requiresSignIn(resource.type)) {
    const callbackUrl = encodeURIComponent(`/resources/${id}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  const typedResource = resource as any;
  const hasAccess = session?.user?.id ? await canAccessResource(session.user.id, id) : false;

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

  const breadcrumbElements = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": dict.home,
      "item": "https://www.entertainlawyers.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": getResourceTypeLabel(resource.type) || 'Study',
      "item": `https://www.entertainlawyers.com/study?type=${resource.type}`
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": typedResource.subject?.semester?.name || dict.semester,
      "item": `https://www.entertainlawyers.com/semesters/${typedResource.subject?.semesterId}`
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": typedResource.subject?.name || dict.subject,
      "item": `https://www.entertainlawyers.com/study?type=${resource.type}&subject=${typedResource.subjectId}`
    }
  ];

  if (resource.unit) {
    breadcrumbElements.push({
      "@type": "ListItem",
      "position": 5,
      "name": resource.unit.name,
      "item": `https://www.entertainlawyers.com/study?type=${resource.type}&subject=${typedResource.subjectId}&unit=${resource.unitId}`
    });
    breadcrumbElements.push({
      "@type": "ListItem",
      "position": 6,
      "name": resource.title,
      "item": `https://www.entertainlawyers.com/resources/${id}`
    });
  } else {
    breadcrumbElements.push({
      "@type": "ListItem",
      "position": 5,
      "name": resource.title,
      "item": `https://www.entertainlawyers.com/resources/${id}`
    });
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbElements
          })
        }}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">

        {/* Breadcrumbs */}
        <nav className="flex text-xs md:text-sm text-text-muted mb-10 overflow-x-auto pb-2 scrollbar-hide" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2 whitespace-nowrap bg-surface-alt px-4 py-2.5 rounded-full border border-border shadow-sm">
            <li className="inline-flex items-center">
              <Link href="/" className="hover:text-accent font-medium transition-colors flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {dict.home}
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-border-strong" />
                <Link href={`/study?type=${resource.type}`} className="hover:text-accent font-medium transition-colors">
                  {getResourceTypeLabel(resource.type) || 'Study'}
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-border-strong" />
                <Link href={`/semesters/${typedResource.subject?.semesterId}`} className="hover:text-accent font-medium transition-colors">
                  {typedResource.subject?.semester?.name}
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-border-strong" />
                <Link href={`/study?type=${resource.type}&subject=${typedResource.subjectId}`} className="hover:text-accent font-medium transition-colors">
                  {typedResource.subject?.name}
                </Link>
              </div>
            </li>
            {resource.unit && (
              <li>
                <div className="flex items-center">
                  <ChevronRight className="w-3.5 h-3.5 mx-1 text-border-strong" />
                  <Link href={`/study?type=${resource.type}&subject=${typedResource.subjectId}&unit=${resource.unitId}`} className="hover:text-accent font-medium transition-colors">
                    {resource.unit.name}
                  </Link>
                </div>
              </li>
            )}
          </ol>
        </nav>

        {/* Content Header */}
        <div className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border tracking-wider uppercase ${
              resource.isPremium
                ? 'bg-gold/10 text-gold-dark border-gold/30'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {resource.isPremium ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
              {resource.isPremium ? dict.premium : dict.free}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-accent/10 text-accent border border-accent/20 tracking-wider uppercase">
              <FileText className="w-3.5 h-3.5" />
              {getResourceTypeLabel(resource.type)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mb-6 leading-tight tracking-tight break-words">
            {resource.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-text-secondary pb-8 border-b border-border/60">
            {typedResource.subject?.semester?.name && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-muted uppercase tracking-wider">{dict.semester}:</span>
                <span className="text-navy dark:text-white font-bold">{typedResource.subject.semester.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-muted uppercase tracking-wider">{dict.subject}:</span>
              <span className="text-navy dark:text-white font-bold">{typedResource.subject?.name}</span>
            </div>
            {resource.unit && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-muted uppercase tracking-wider">{dict.unit}:</span>
                <span className="text-navy dark:text-white font-bold">{resource.unit.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Access Control Box */}
        <div className="bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-border rounded-2xl mb-12 overflow-hidden relative group">
          {/* Top Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent/50" />

          <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-border bg-surface-alt/30">
            <h2 className="text-xl font-bold text-navy dark:text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <FileText className="w-4 h-4" />
              </div>
              {dict.accessThisResource}
            </h2>
          </div>

          <div className="p-5 sm:p-8 md:p-10 bg-surface">
            {resource.isPremium && resource.priceAmount !== null && (
              <div className="flex items-center justify-center mb-10">
                <div className="bg-surface-alt/50 border border-border px-5 sm:px-8 py-4 sm:py-5 rounded-2xl text-center shadow-soft relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-bl-full -z-10"></div>
                  <p className="text-xs text-text-secondary font-bold mb-2 uppercase tracking-widest">{dict.oneTimePurchase}</p>
                  <p className="text-4xl font-extrabold text-navy dark:text-white tracking-tight">
                    <span className="text-xl text-text-muted font-semibold mr-1">NPR</span>
                    {(resource.priceAmount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {!session?.user ? (
              <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center text-accent mb-6 border border-accent/10">
                  <Lock className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-navy dark:text-white mb-3 tracking-tight">Login Required</h3>
                <p className="text-text-secondary mb-8 text-lg">{dict.signInToAccess}</p>
                <Link
                  href={`/login?callbackUrl=/resources/${id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent-hover transition-all shadow-[0_4px_15px_rgba(var(--color-accent),0.3)] hover:shadow-[0_6px_20px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5"
                >
                  {dict.signInToContinue}
                </Link>
              </div>
            ) : hasAccess ? (
              <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-6 border border-green-200">
                  <LockOpen className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-navy dark:text-white mb-2 tracking-tight">Access Granted</h3>
                <p className="text-green-700 font-bold mb-8 text-lg">{dict.youHaveAccess}</p>

                {resource.documentId && (
                  <Link
                    href={`/read/${resource.id}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent-hover transition-all shadow-[0_4px_15px_rgba(var(--color-accent),0.3)] hover:shadow-[0_6px_20px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5 group mb-6"
                  >
                    <BookOpen className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    {dict.readDocument}
                  </Link>
                )}

                {!resource.documentId && (
                  <div className="inline-flex items-center justify-center px-8 py-4 border border-border text-sm font-bold rounded-xl text-text-muted bg-surface-alt cursor-not-allowed">
                    {dict.pdfComingSoon}
                  </div>
                )}

                {/* Removed obsolete resource.content scroll hint */}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center text-gold-dark mb-6 border border-gold/20">
                  <Lock className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-navy dark:text-white mb-3 tracking-tight">Premium Resource</h3>
                <p className="text-text-secondary text-lg mb-10 leading-relaxed">
                  {dict.premiumResourceDesc}
                </p>
                <div className="flex flex-col sm:flex-row gap-5 items-center justify-center w-full">
                  <div className="w-full sm:w-auto">
                    <CheckoutButtons
                      resourceId={resource.id}
                      priceAmount={resource.priceAmount ?? 0}
                      currency={resource.currency}
                      paymentsEnabled={env.PAYMENTS_ENABLED === 'true'}
                    />
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-px bg-border flex-1 sm:hidden"></div>
                    <span className="text-text-muted text-sm font-bold uppercase tracking-wider">{dict.or}</span>
                    <div className="h-px bg-border flex-1 sm:hidden"></div>
                  </div>
                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-sm font-bold rounded-xl text-navy bg-surface border border-border hover:border-accent hover:text-accent hover:bg-accent/5 transition-all shadow-sm hover:shadow-soft"
                  >
                    {dict.viewSubscriptionPlans}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasAccess && false && (
          <div className="bg-white dark:bg-zinc-950 p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl border border-black/5 dark:border-white/5 mb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-x-auto">
            <div
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-dark prose-img:rounded-xl prose-img:shadow-md"
              dangerouslySetInnerHTML={{ __html: "" }}
            />
          </div>
        )}

        {/* Navigation */}
        {(prevResource || nextResource) && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-border pt-8 mt-12">
            {prevResource ? (
              <Link
                href={`/resources/${prevResource.id}`}
                className="group flex items-center gap-3 text-sm font-bold text-navy hover:text-accent transition-colors w-full sm:w-auto sm:max-w-[45%] p-4 rounded-xl hover:bg-surface border border-transparent hover:border-border"
              >
                <ChevronLeft className="w-5 h-5 flex-shrink-0 text-text-muted group-hover:text-accent transition-colors" />
                <span className="truncate">{prevResource.title}</span>
              </Link>
            ) : <div className="hidden sm:block flex-1" />}

            {nextResource ? (
              <Link
                href={`/resources/${nextResource.id}`}
                className="group flex items-center justify-end gap-3 text-sm font-bold text-navy hover:text-accent transition-colors w-full sm:w-auto sm:max-w-[45%] text-right p-4 rounded-xl hover:bg-surface border border-transparent hover:border-border"
              >
                <span className="truncate">{nextResource.title}</span>
                <ChevronRight className="w-5 h-5 flex-shrink-0 text-text-muted group-hover:text-accent transition-colors" />
              </Link>
            ) : <div className="hidden sm:block flex-1" />}
          </div>
        )}
      </main>
    </div>
  );
}
