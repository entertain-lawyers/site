import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';
import ResourceTypeFilter from '@/components/study/ResourceTypeFilter';
import { BookOpen, ChevronRight, Lock, Library, GraduationCap, ChevronLeft } from 'lucide-react';
import { SYLLABUS_CONFIG, isAuthoritativeSubject, findAuthoritativeSubject } from '@/lib/syllabus-config';
import { serializeJsonLd, getSiteUrl } from '@/lib/seo';
import { Reveal } from '@/components/motion/primitives';

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_COLORS: Record<string, string> = {
  LAW_NOTE: 'bg-blue-100 text-blue-800 border-blue-200',
  CASE_LAW: 'bg-purple-100 text-purple-800 border-purple-200',
  OLD_QUESTION: 'bg-amber-100 text-amber-800 border-amber-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const semester = await prisma.semester.findUnique({
    where: { id },
  });
  
  if (!semester) notFound();

  return {
    title: `${semester.name} Resources`,
    description: `Study materials, notes, case laws, and old questions for ${semester.name}.`,
    alternates: {
      canonical: `/semesters/${id}`,
    },
    openGraph: {
      title: `${semester.name} Resources`,
      description: `Study materials, notes, case laws, and old questions for ${semester.name}.`,
      url: `${getSiteUrl()}/semesters/${id}`,
    },
  };
}

export default async function SemesterPage({ params }: PageProps) {
  const dict = await getDictionary();
  const { id } = await params;

  const TYPE_LABELS: Record<string, string> = {
    LAW_NOTE: dict.catLawNotes,
    CASE_LAW: dict.catCaseLaws,
    OLD_QUESTION: dict.catOldQuestions,
    OTHER: dict.catHistoricalFacts,
  };

  const semester = await prisma.semester.findUnique({
    where: { id },
    include: {
      subjects: {
        orderBy: { order: 'asc' },
        include: {
          units: {
            orderBy: { order: 'asc' },
            include: {
              resources: {
                // Titles only: never load note text into a public listing, and
                // never list draft or archived material.
                where: { status: 'PUBLISHED' },
                orderBy: [{ order: 'asc' }, { title: 'asc' }],
                select: { id: true, title: true, type: true, isPremium: true, unitId: true },
              },
            },
          },
          resources: {
            where: { status: 'PUBLISHED' },
            orderBy: [{ order: 'asc' }, { title: 'asc' }],
            select: { id: true, title: true, type: true, isPremium: true, unitId: true },
          },
        },
      },
    },
  });

  if (!semester) {
    notFound();
  }

  // Filter out empty legacy subjects (0 units and 0 resources) and sort in authoritative 1..N order
  const semesterConfig = SYLLABUS_CONFIG.find((c) => c.order === semester.order);
  const activeSubjects = semester.subjects
    .filter((sub) => {
      if (semesterConfig) {
        const isAuth = isAuthoritativeSubject(semester.order, sub.name);
        if (isAuth) return true;
        // Keep if it has attached resources
        return sub.resources.length > 0 || sub.units.some((u) => u.resources.length > 0);
      }
      return true;
    })
    .sort((a, b) => {
      if (semesterConfig) {
        const authA = findAuthoritativeSubject(semester.order, a.name);
        const authB = findAuthoritativeSubject(semester.order, b.name);
        if (authA && authB) return authA.order - authB.order;
        if (authA && !authB) return -1;
        if (!authA && authB) return 1;
      }
      return a.order - b.order;
    });

  return (
    <div className="bg-background min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": `${getSiteUrl()}/`
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Semesters",
                "item": `${getSiteUrl()}/semesters`
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": semester.name,
                "item": `${getSiteUrl()}/semesters/${id}`
              }
            ]
          })
        }}
      />
      
      {/* Header Section */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <Link href="/semesters" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-accent mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {dict.backToSemesters}
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-accent">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-navy dark:text-white tracking-tight">{semester.name}</h1>
              <p className="text-lg text-text-secondary mt-1">{activeSubjects.length} {dict.subjects} • {dict.unitsAndResources}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeSubjects.some(s => s.resources.length > 0) && (
          <div className="mb-10">
            <ResourceTypeFilter 
              dict={{
                all: dict.all,
                catLawNotes: dict.catLawNotes,
                catCaseLaws: dict.catCaseLaws,
                catOldQuestions: dict.catOldQuestions,
                catOthers: dict.catOthers,
              }}
            />
          </div>
        )}

        {activeSubjects.length > 0 ? (
          <div className="space-y-10">
            {activeSubjects.map((subject, i) => {
              const hasUnits = subject.units.length > 0;
              const unassignedResources = subject.resources.filter(r => !r.unitId);

              return (
                <Reveal key={subject.id} index={i} perRow={1}>
                <section className="bg-surface border border-border rounded-2xl overflow-hidden shadow-soft transition-[box-shadow,border-color,background-color] hover:shadow-soft-lg">
                  <div className="bg-navy dark:bg-navy-dark px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-blue-200" />
                      <h2 className="text-xl font-bold text-white">{subject.name}</h2>
                    </div>
                    <Link
                      href={`/study?semester=${semester.id}&subject=${subject.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-semibold transition-colors"
                    >
                      {dict.study}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  <div className="p-6">
                    {hasUnits ? (
                      <div className="space-y-8">
                        {subject.units.map((unit) => (
                          <div key={unit.id} className="border-b border-border/50 pb-8 last:border-0 last:pb-0">
                            <div className="mb-5 flex flex-wrap items-baseline gap-3">
                              <h3 className="text-lg font-bold text-navy dark:text-white">
                                {unit.name}
                              </h3>
                              {unit.title && (
                                <span className="text-sm font-medium text-text-secondary bg-surface-alt px-3 py-1 rounded-full border border-border">
                                  {unit.title}
                                </span>
                              )}
                            </div>
                            
                            {unit.resources.length > 0 ? (
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {unit.resources.map((resource) => (
                                  <li key={resource.id}>
                                    <Link
                                      href={`/resources/${resource.id}`}
                                      className="group flex flex-col justify-between h-full p-4 border border-border rounded-xl hover:border-accent hover:bg-surface-alt transition-all"
                                    >
                                      <div className="flex items-start justify-between mb-3 gap-2">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border tracking-wide ${TYPE_COLORS[resource.type] || TYPE_COLORS.OTHER}`}>
                                          {TYPE_LABELS[resource.type] || 'Other'}
                                        </span>
                                        {resource.isPremium && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gold/10 text-gold-dark border border-gold/20 uppercase tracking-wider">
                                            <Lock className="w-3 h-3" />
                                            {dict.premium}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                                        {resource.title}
                                      </h4>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="bg-surface-alt border border-border border-dashed rounded-xl p-6 text-center">
                                <p className="text-sm text-text-muted">{dict.noResourcesFound}</p>
                              </div>
                            )}
                          </div>
                        ))}

                        {unassignedResources.length > 0 && (
                          <div className="border-t border-border pt-8">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
                              <Library className="w-4 h-4" />
                              Additional {dict.resources}
                            </h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {unassignedResources.map((resource) => (
                                <li key={resource.id}>
                                  <Link
                                    href={`/resources/${resource.id}`}
                                    className="group flex flex-col justify-between h-full p-4 border border-border rounded-xl hover:border-accent hover:bg-surface-alt transition-all"
                                  >
                                    <div className="flex items-start justify-between mb-3 gap-2">
                                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md border tracking-wide ${TYPE_COLORS[resource.type] || TYPE_COLORS.OTHER}`}>
                                        {TYPE_LABELS[resource.type] || 'Other'}
                                      </span>
                                      {resource.isPremium && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gold/10 text-gold-dark border border-gold/20 uppercase tracking-wider">
                                          <Lock className="w-3 h-3" />
                                          {dict.premium}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                                      {resource.title}
                                    </h4>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      subject.resources.length > 0 ? (
                        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {subject.resources.map((resource) => (
                            <li key={resource.id}>
                              <Link 
                                href={`/resources/${resource.id}`}
                                className="group flex flex-col justify-between h-full p-4 border border-border rounded-xl hover:border-accent hover:bg-surface-alt transition-all"
                              >
                                <div className="flex items-start justify-between mb-3 gap-2">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border tracking-wide ${TYPE_COLORS[resource.type] || TYPE_COLORS.OTHER}`}>
                                    {TYPE_LABELS[resource.type] || 'Other'}
                                  </span>
                                  {resource.isPremium && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gold/10 text-gold-dark border border-gold/20 uppercase tracking-wider">
                                      <Lock className="w-3 h-3" />
                                      {dict.premium}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
                                  {resource.title}
                                </h3>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="bg-surface-alt border border-border border-dashed rounded-xl p-8 text-center">
                          <Library className="w-8 h-8 text-text-muted mx-auto mb-3" />
                          <p className="text-text-secondary">{dict.noResourcesFound}</p>
                        </div>
                      )
                    )}
                  </div>
                </section>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
              <Library className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">{dict.noResourcesFound}</h3>
            <p className="text-text-secondary">{dict.noResourcesFound}</p>
          </div>
        )}
      </div>
    </div>
  );
}
