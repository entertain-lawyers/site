'use client';

import { useSearchParams } from 'next/navigation';
import { HomeCategoryCard } from '@/components/home/HomeCategoryCard';
import { GraduationCap, BookOpen, Layers } from 'lucide-react';

interface SelectorOption {
  id: string;
  name: string;
}

interface UnitOption extends SelectorOption {
  title?: string | null;
}

interface StudyCardNavigatorProps {
  semesters: SelectorOption[];
  subjects: SelectorOption[];
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

  // If a unit is already selected, we don't need to show drill-down cards (they can just see the resources)
  if (selectedUnitId) return null;

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
    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight">
          Select Semester
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {semesters.map((s) => (
            <HomeCategoryCard
              key={s.id}
              title={s.name}
              subtitle="Explore Subjects"
              href={buildHref('semester', s.id)}
              icon={GraduationCap}
            />
          ))}
        </div>
      </div>
    );
  }

  // LEVEL 2: Select Subject
  if (!selectedSubjectId) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight">
          Select Subject
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {subjects.map((s) => (
            <HomeCategoryCard
              key={s.id}
              title={s.name}
              subtitle="View Units"
              href={buildHref('subject', s.id)}
              icon={BookOpen}
            />
          ))}
        </div>
      </div>
    );
  }

  // LEVEL 3: Select Unit
  if (!selectedUnitId) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight">
          Select Unit
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {units.map((u) => (
            <HomeCategoryCard
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
