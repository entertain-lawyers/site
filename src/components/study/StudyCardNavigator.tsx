'use client';

import { useSearchParams } from 'next/navigation';
import { HomeCategoryCard } from '@/components/home/HomeCategoryCard';
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
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight uppercase">
          Select Semester
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {semesters.map((s) => {
            // Fallback order parsing if order is missing.
            // But Prisma schema has an `order` field on Semester, so it should be passed down.
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
    const coreSubjects = subjects.filter(s => !s.isElective && !s.isSeminar);
    const electives = subjects.filter(s => s.isElective);
    const seminars = subjects.filter(s => s.isSeminar);

    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-6 tracking-tight uppercase">
          Select Subject
        </h2>
        
        {coreSubjects.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider">Core Subjects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {coreSubjects.map((s) => (
                <HomeCategoryCard
                  key={s.id}
                  title={s.name.toUpperCase()}
                  subtitle="VIEW UNITS"
                  href={buildHref('subject', s.id)}
                  icon={BookOpen}
                />
              ))}
            </div>
          </div>
        )}

        {electives.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider">Elective Subjects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {electives.map((s) => (
                <HomeCategoryCard
                  key={s.id}
                  title={s.name.toUpperCase()}
                  subtitle="VIEW UNITS"
                  href={buildHref('subject', s.id)}
                  icon={BookOpen}
                />
              ))}
            </div>
          </div>
        )}

        {seminars.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider">Seminars</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {seminars.map((s) => (
                <HomeCategoryCard
                  key={s.id}
                  title={s.name.toUpperCase()}
                  subtitle="VIEW MATERIALS"
                  href={buildHref('subject', s.id)}
                  icon={BookOpen}
                />
              ))}
            </div>
          </div>
        )}
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
            <HomeCategoryCard
              key={u.id}
              title={u.name.toUpperCase()}
              subtitle={(u.title || "Read Materials").toUpperCase()}
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
