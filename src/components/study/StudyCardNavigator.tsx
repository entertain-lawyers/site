'use client';

import { useSearchParams } from 'next/navigation';
import { SubjectCard } from '@/components/study/SubjectCard';
import { HomeSemesterCard } from '@/components/home/HomeSemesterCard';
import { BookOpen, Layers } from 'lucide-react';

interface SelectorOption {
  id: string;
  name: string;
  order?: number;
}

interface SubjectOption extends SelectorOption {
  isElective?: boolean;
  isSeminar?: boolean;
}

interface UnitOption extends SelectorOption {
  title?: string | null;
}

interface StudyCardNavigatorProps {
  semesters: SelectorOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  selectedSemesterId?: string;
  selectedSubjectId?: string;
  selectedUnitId?: string;
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

  // If a unit is already selected, we don't need to show drill-down cards
  if (selectedUnitId) return null;

  const isOldQuestion = searchParams.get('type') === 'OLD_QUESTION';

  // For Old Questions, we don't need subject/unit drill-down.
  // If semester is selected, the resources are already displayed.
  if (isOldQuestion && selectedSemesterId) return null;

  const buildHref = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    // When clicking a semester, clear deeper selections
    if (key === 'semester') {
      params.delete('subject');
      params.delete('unit');
    }
    // When clicking a subject, clear unit
    if (key === 'subject') {
      params.delete('unit');
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
          {canonicalSemesters.map((s) => {
            let order = s.order;
            if (typeof order !== 'number') {
              const match = s.name.match(/^(\d+)/);
              order = match ? parseInt(match[1], 10) : 1;
            }
            return (
              <HomeSemesterCard
                key={s.id}
                order={order}
                href={buildHref('semester', s.id)}
              />
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
          {orderedSubjects.map((s) => {
            const subtitle = s.isSeminar ? 'SEMINAR' : (s.isElective ? 'ELECTIVE' : 'VIEW UNITS');
            return (
              <SubjectCard
                key={s.id}
                title={s.name}
                subtitle={subtitle}
                href={buildHref('subject', s.id)}
                icon={BookOpen}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // LEVEL 3: Select Unit
  if (!selectedUnitId) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight uppercase">
          Select Unit
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {units.map((u) => (
            <SubjectCard
              key={u.id}
              title={u.name}
              subtitle={u.title || "Read Materials"}
              href={buildHref('unit', u.id)}
              icon={Layers}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
