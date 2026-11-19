'use client';

import { useSearchParams } from 'next/navigation';
import { SubjectCard } from '@/components/study/SubjectCard';
import { HomeSemesterCard } from '@/components/home/HomeSemesterCard';
import { BookOpen, Layers, Scale } from 'lucide-react';
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

  // When a unit is selected (ordinary unit or prescribed cases), content renders below
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
