'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SubjectCard } from '@/components/study/SubjectCard';
import { HomeSemesterCard } from '@/components/home/HomeSemesterCard';
import { BookOpen, Layers, Scale, Sparkles, History, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/primitives';
import { isPrescribedCasesUnit } from '@/lib/case-category';

interface SelectorOption {
  id: string;
  name: string;
  order?: number;
}

interface SubjectOption extends SelectorOption {
  isElective?: boolean;
  isSeminar?: boolean;
}

export interface UnitOption extends SelectorOption {
  title?: string | null;
  resourceCount?: number;
  singleResourceId?: string | null;
  newCaseCount?: number;
  oldCaseCount?: number;
}

interface StudyCardNavigatorProps {
  semesters: SelectorOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  selectedSemesterId?: string;
  selectedSubjectId?: string;
  selectedUnitId?: string;
  selectedCaseCategory?: string;
}

export default function StudyCardNavigator({
  semesters,
  subjects,
  units,
  selectedSemesterId,
  selectedSubjectId,
  selectedUnitId,
  selectedCaseCategory,
}: StudyCardNavigatorProps) {
  const searchParams = useSearchParams();

  const isOldQuestion = searchParams.get('type') === 'OLD_QUESTION';

  // For Old Questions, we don't need subject/unit drill-down.
  // If semester is selected, the resources are already displayed.
  if (isOldQuestion && selectedSemesterId) return null;

  const buildHref = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // When clicking a semester, clear deeper selections
    if (key === 'semester') {
      params.delete('subject');
      params.delete('unit');
      params.delete('caseCategory');
    }
    // When clicking a subject, clear unit and caseCategory
    if (key === 'subject') {
      params.delete('unit');
      params.delete('caseCategory');
    }
    // When changing unit, clear caseCategory
    if (key === 'unit') {
      params.delete('caseCategory');
    }
    return `/study?${params.toString()}`;
  };

  // LEVEL 1: Select Semester
  if (!selectedSemesterId) {
    const canonicalSemesters = semesters
      .filter((s) => s.name.toLowerCase().includes('semester'))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight uppercase">
          Select Semester
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {canonicalSemesters.map((s, i) => {
            let order = s.order;
            if (typeof order !== 'number') {
              const match = s.name.match(/^(\d+)/);
              order = match ? parseInt(match[1], 10) : 1;
            }
            return (
              <Reveal key={s.id} index={i} perRow={3} lift className="h-full">
                <HomeSemesterCard
                  order={order}
                  href={buildHref('semester', s.id)}
                />
              </Reveal>
            );
          })}
        </div>
      </div>
    );
  }

  // LEVEL 2: Select Subject
  if (!selectedSubjectId) {
    // Strictly preserve and render subjects in the exact client-specified order (1..N)
    const orderedSubjects = [...subjects].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight uppercase">
          Select Subject
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {orderedSubjects.map((s, i) => {
            const subtitle = s.isSeminar ? 'SEMINAR' : (s.isElective ? 'ELECTIVE' : 'VIEW UNITS');
            return (
              <Reveal key={s.id} index={i} perRow={3} lift className="h-full">
                <SubjectCard
                  title={s.name}
                  subtitle={subtitle}
                  href={buildHref('subject', s.id)}
                  icon={BookOpen}
                />
              </Reveal>
            );
          })}
        </div>
      </div>
    );
  }

  // LEVEL 4 (Special Case): Prescribed Cases Unit Selected
  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const isCasesUnit = selectedUnit && isPrescribedCasesUnit(selectedUnit);

  if (selectedUnitId && isCasesUnit) {
    // LEVEL 4A: Prescribed Cases selected without a caseCategory -> Show New Case & Old Case options first!
    if (!selectedCaseCategory) {
      return (
        <div className="mb-12" data-testid="prescribed-cases-options">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-navy dark:text-white tracking-tight uppercase flex items-center gap-2">
              <Scale className="w-5 h-5 text-accent" />
              <span>Prescribed Cases — Select Classification</span>
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Select New Case or Old Case to study landmark judgments prescribed for this subject.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* New Case Card */}
            <Reveal index={0} perRow={2} lift className="h-full">
              <Link
                href={buildHref('caseCategory', 'NEW_CASE')}
                data-testid="select-new-case"
                className="group relative flex flex-col p-8 bg-surface border-2 border-emerald-500/30 hover:border-emerald-500 rounded-2xl hover:shadow-[0_8px_30px_rgba(16,185,129,0.18)] transition-all duration-300 h-full"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-extrabold text-navy dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    New Case
                  </h3>
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                    {selectedUnit.newCaseCount ?? 0} Cases
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  Recent landmark judgments and newly prescribed precedents for this syllabus.
                </p>
                <div className="mt-auto flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Open New Cases</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </Reveal>

            {/* Old Case Card */}
            <Reveal index={1} perRow={2} lift className="h-full">
              <Link
                href={buildHref('caseCategory', 'OLD_CASE')}
                data-testid="select-old-case"
                className="group relative flex flex-col p-8 bg-surface border-2 border-amber-500/30 hover:border-amber-500 rounded-2xl hover:shadow-[0_8px_30px_rgba(245,158,11,0.18)] transition-all duration-300 h-full"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <History className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-extrabold text-navy dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Old Case
                  </h3>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800/50">
                    {selectedUnit.oldCaseCount ?? 0} Cases
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  Established precedents and historical landmark judgments prescribed for this subject.
                </p>
                <div className="mt-auto flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                  <span>Open Old Cases</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      );
    }

    // LEVEL 4B: Case Category already selected -> Render active toggle header above cards
    return (
      <div className="mb-8" data-testid="prescribed-cases-category-switcher">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface border border-border rounded-2xl shadow-soft">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Category:
            </span>
            <div className="inline-flex p-1 bg-surface-alt rounded-xl border border-border">
              <Link
                href={buildHref('caseCategory', 'NEW_CASE')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedCaseCategory === 'NEW_CASE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-text-secondary hover:text-navy dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Case ({selectedUnit.newCaseCount ?? 0})</span>
              </Link>
              <Link
                href={buildHref('caseCategory', 'OLD_CASE')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedCaseCategory === 'OLD_CASE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-text-secondary hover:text-navy dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Old Case ({selectedUnit.oldCaseCount ?? 0})</span>
              </Link>
            </div>
          </div>

          <Link
            href={buildHref('caseCategory', '')}
            className="text-xs font-semibold text-text-muted hover:text-accent transition-colors"
          >
            ← View All Options
          </Link>
        </div>
      </div>
    );
  }

  // If an ordinary unit is selected, StudyCardNavigator renders nothing (resources render below)
  if (selectedUnitId) return null;

  // LEVEL 3: Select Unit (Unit cards with Direct Navigation)
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight uppercase">
        Select Unit
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
        {units.map((u, i) => {
          const isCase = isPrescribedCasesUnit(u);
          
          let href: string;
          let subtitle: string;
          let icon = Layers;

          if (isCase) {
            icon = Scale;
            href = buildHref('unit', u.id);
            subtitle =
              u.newCaseCount !== undefined && u.oldCaseCount !== undefined
                ? `${u.newCaseCount} New • ${u.oldCaseCount} Old Cases`
                : 'Prescribed Cases';
          } else if (u.singleResourceId) {
            // DIRECT UNIT NAVIGATION: single resource opens directly!
            icon = BookOpen;
            href = `/resources/${u.singleResourceId}`;
            subtitle = u.title || 'Read Note';
          } else if (u.resourceCount && u.resourceCount > 1) {
            icon = Layers;
            href = buildHref('unit', u.id);
            subtitle = `${u.resourceCount} Materials Available`;
          } else {
            icon = Layers;
            href = buildHref('unit', u.id);
            subtitle = u.title || 'No Materials Yet';
          }

          return (
            <Reveal key={u.id} index={i} perRow={3} lift className="h-full">
              <SubjectCard
                title={u.name}
                subtitle={subtitle}
                href={href}
                icon={icon}
              />
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
