import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import StudySelector from '@/components/study/StudySelector';
import StudyCardNavigator from '@/components/study/StudyCardNavigator';
import ResourceTypeFilter from '@/components/study/ResourceTypeFilter';
import CaseLawLanding from '@/components/study/CaseLawLanding';
import Link from 'next/link';
import { ResourceType } from '@prisma/client';
import { getDictionary } from '@/lib/i18n';
import { BookOpen, Scale, FileQuestion, Library, ArrowRight, Lock } from 'lucide-react';

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const type = params.type;

  if (type === 'LAW_NOTE') return { title: 'Law Notes | Entertain Lawyer', description: 'Comprehensive notes covering the BALLB & LLB syllabus.' };
  if (type === 'CASE_LAW') return { title: 'Precedent Case Laws | Entertain Lawyer', description: 'Landmark judgments and essential case summaries.' };
  if (type === 'OLD_QUESTION') return { title: 'Past Examination Questions | Entertain Lawyer', description: 'Previous year university examination question papers.' };

  return {
    title: 'Study Materials | Entertain Lawyer',
    description: 'Browse law notes, case laws, and past questions by semester and subject.',
  };
}

const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  LAW_NOTE: 'bg-blue-100 text-blue-800 border-blue-200',
  CASE_LAW: 'bg-purple-100 text-purple-800 border-purple-200',
  OLD_QUESTION: 'bg-amber-100 text-amber-800 border-amber-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
};

const iconMap: Record<string, any> = {
  LAW_NOTE: BookOpen,
  CASE_LAW: Scale,
  OLD_QUESTION: FileQuestion,
  OTHER: Library,
};

type SearchParams = Promise<{
  semester?: string;
  subject?: string;
  unit?: string;
  type?: string;
  q?: string;
}>;

export default async function StudyPage(props: { searchParams: SearchParams }) {
  const dict = await getDictionary();
  const searchParams = await props.searchParams;

  const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
    LAW_NOTE: dict.catLawNotes,
    CASE_LAW: dict.catCaseLaws,
    OLD_QUESTION: dict.catOldQuestions,
    OTHER: dict.catHistoricalFacts,
  };

  const selectedSemesterId = searchParams.semester;
  const selectedSubjectId = searchParams.subject;
  const selectedUnitId = searchParams.unit;
  const selectedType = searchParams.type as ResourceType | undefined;
  const searchQuery = searchParams.q;

  // 1. Fetch reference data for selectors
  const getCachedSemesters = unstable_cache(
    async () => prisma.semester.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
    ['study-semesters'],
    { revalidate: 3600 }
  );

  const getCachedSubjects = unstable_cache(
    async (semesterId: string) => prisma.subject.findMany({
      where: { semesterId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    ['study-subjects'],
    { revalidate: 3600 }
  );

  const getCachedUnits = unstable_cache(
    async (subjectId: string) => prisma.unit.findMany({
      where: { subjectId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, title: true },
    }),
    ['study-units'],
    { revalidate: 3600 }
  );

  // 2. Fetch in parallel
  const [semesters, subjects, units, resources] = await Promise.all([
    getCachedSemesters(),
    selectedSemesterId ? getCachedSubjects(selectedSemesterId) : Promise.resolve([]),
    selectedSubjectId ? getCachedUnits(selectedSubjectId) : Promise.resolve([]),
    prisma.resource.findMany({
      where: { status: 'PUBLISHED',
        ...(selectedSemesterId && { subject: { semesterId: selectedSemesterId } }),
        ...(selectedSubjectId && { subjectId: selectedSubjectId }),
        ...(selectedUnitId && { unitId: selectedUnitId }),
        ...(selectedType && Object.values(ResourceType).includes(selectedType) && { type: selectedType }),
        ...(searchQuery && {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        title: true,
        type: true,
        isPremium: true,
        priceAmount: true,
        order: true,
        subject: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: [
        { subject: { name: 'asc' } },
        { order: 'asc' },
        { title: 'asc' },
      ],
    })
  ]);

  let pageTitle = dict.studyMaterialsTitle;
  let pageDesc = dict.studyMaterialsDesc || "Explore our comprehensive collection of academic resources tailored for law students.";

  if (selectedType === 'LAW_NOTE') {
    pageTitle = dict.catLawNotes || "Law Notes";
    pageDesc = "Comprehensive notes covering the BALLB & LLB syllabus.";
  } else if (selectedType === 'CASE_LAW') {
    if (searchQuery === 'civil') {
      pageTitle = "Civil Cases";
      pageDesc = "Browse and study landmark civil judgments.";
    } else if (searchQuery === 'criminal') {
      pageTitle = "Criminal Cases";
      pageDesc = "Browse and study landmark criminal judgments.";
    } else if (searchQuery === 'writ') {
      pageTitle = "Writs";
      pageDesc = "Browse and study landmark writ petitions and orders.";
    } else {
      pageTitle = dict.catCaseLaws || "Precedent Case Laws";
      pageDesc = "Landmark judgments and essential case summaries.";
    }
  } else if (selectedType === 'OLD_QUESTION') {
    pageTitle = dict.catOldQuestions || "Old Questions";
    pageDesc = "Previous year university examination question papers.";
  }

  return (
    <div className="bg-background min-h-screen pb-20 transition-colors duration-300">
      <div className="bg-surface border-b border-border relative overflow-hidden">
        {/* Subtle Background Pattern/Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/5 via-background to-transparent dark:from-accent/10 dark:via-background dark:to-transparent opacity-70 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative z-10">
          <h1 className="text-fluid-h1 font-extrabold text-navy dark:text-white mb-4 tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-fluid-base text-text-secondary max-w-2xl leading-relaxed">
            {pageDesc}
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-20 -mt-4 sm:-mt-6">
        {(selectedType === 'CASE_LAW' && !searchQuery && !selectedSemesterId && !selectedSubjectId) ? (
          <CaseLawLanding />
        ) : (
          <>
            {selectedType !== 'CASE_LAW' && (
              <div className="bg-surface shadow-soft border border-border rounded-2xl p-4 sm:p-6 mb-8 sm:mb-12">
                <StudySelector
            dict={{
              semester: dict.semester,
              subject: dict.subject,
              unit: dict.unit,
              allSemesters: dict.allSemesters,
              allSubjects: dict.allSubjects,
              allUnits: dict.allUnits,
              selectSemesterFirst: dict.selectSemesterFirst,
              selectSubjectFirst: dict.selectSubjectFirst,
              noUnitsAvailable: dict.noUnitsAvailable,
            }}
            semesters={semesters}
            subjects={subjects}
            units={units}
            selectedSemesterId={selectedSemesterId}
            selectedSubjectId={selectedSubjectId}
            selectedUnitId={selectedUnitId}
          />
            </div>
            )}
            
            {/* The new Drill-down Card Navigator */}
            {selectedType !== 'CASE_LAW' && (
              <StudyCardNavigator 
                semesters={semesters}
                subjects={subjects}
                units={units}
                selectedSemesterId={selectedSemesterId}
                selectedSubjectId={selectedSubjectId}
                selectedUnitId={selectedUnitId}
              />
            )}

        {!selectedType && resources.length > 0 && (
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

        <div>
          {/* If the user is browsing normally, force them to drill down to at least a subject or unit before showing resource results, UNLESS they searched */}
          {(!selectedUnitId && !searchQuery && selectedType !== 'CASE_LAW') ? null : resources.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-8 sm:p-16 text-center shadow-soft flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-6 text-text-muted shadow-sm">
                {selectedType === 'CASE_LAW' ? <Scale className="w-8 h-8" /> : <Library className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold text-navy dark:text-white mb-2 tracking-tight">
                {selectedType === 'CASE_LAW' ? "No cases found" : dict.noResourcesFound}
              </h3>
              <p className="text-text-secondary max-w-md mx-auto">
                {selectedType === 'CASE_LAW' ? "Check back later for case updates." : (dict.tryAdjustingFilters || "Try adjusting your filters to find what you're looking for.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => {
                const Icon = iconMap[resource.type] || Library;
                return (
                  <Link
                    key={resource.id}
                    href={`/resources/${resource.id}`}
                    className="group flex flex-col bg-surface border border-border rounded-2xl hover:border-accent hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] hover:-translate-y-1 transition-all duration-300 p-6 h-full relative overflow-hidden"
                  >
                    {/* Top Accent Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-start justify-between mb-5 gap-2 flex-wrap relative z-10">
                      {!selectedType && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase border ${RESOURCE_TYPE_COLORS[resource.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {RESOURCE_TYPE_LABELS[resource.type] || 'Other'}
                        </span>
                      )}
                      {resource.isPremium ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-gold/10 text-gold-dark border border-gold/30 tracking-wider uppercase">
                          <Lock className="w-3 h-3" />
                          {dict.premium} (Rs. {(resource.priceAmount || 0) / 100})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200 tracking-wider uppercase">
                          {dict.free}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-navy dark:text-white group-hover:text-accent transition-colors mb-4 line-clamp-2 leading-tight">
                      {resource.title}
                    </h3>

                    <div className="mt-auto space-y-2 mb-6">
                      <div className="flex items-start gap-2 text-sm text-text-secondary font-medium">
                        <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-muted" />
                        <span className="line-clamp-1">{resource.subject?.name || 'Uncategorized'}</span>
                      </div>
                      {resource.unit && (
                        <div className="flex items-start gap-2 text-sm text-text-secondary font-medium">
                          <div className="w-4 h-4 flex-shrink-0 ml-0.5 border-l-2 border-b-2 border-border rounded-bl-md" />
                          <span className="line-clamp-1">{resource.unit.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-5 border-t border-border flex justify-between items-center group-hover:border-accent/30 transition-colors">
                      <span className="text-sm font-bold text-accent">
                        {resource.type === 'LAW_NOTE' ? 'Read Note' : resource.type === 'CASE_LAW' ? 'Read Case' : resource.type === 'OLD_QUESTION' ? 'View Question' : dict.readMore}
                      </span>
                      <ArrowRight className="w-4 h-4 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}
