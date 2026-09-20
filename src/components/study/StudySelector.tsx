'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import CustomSelect from './CustomSelect';

interface SelectorOption {
  id: string;
  name: string;
}

interface UnitOption extends SelectorOption {
  title?: string | null;
}

interface StudySelectorProps {
  dict: {
    semester: string;
    subject: string;
    unit: string;
    allSemesters: string;
    allSubjects: string;
    allUnits: string;
    selectSemesterFirst: string;
    selectSubjectFirst: string;
    noUnitsAvailable: string;
  };
  semesters: SelectorOption[];
  subjects: SelectorOption[];
  units: UnitOption[];
  selectedSemesterId?: string;
  selectedSubjectId?: string;
  selectedUnitId?: string;
}

export default function StudySelector({
  dict,
  semesters,
  subjects,
  units,
  selectedSemesterId,
  selectedSubjectId,
  selectedUnitId,
}: StudySelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string, clearKeys?: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (clearKeys) {
        clearKeys.forEach((k) => params.delete(k));
      }
      router.push(`/study?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Map options for CustomSelect
  const semesterOptions = [
    { value: '', label: dict.allSemesters },
    ...semesters.map((s) => ({ value: s.id, label: s.name })),
  ];

  const subjectOptions = [
    {
      value: '',
      label: selectedSemesterId ? dict.allSubjects : dict.selectSemesterFirst,
    },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];

  const unitOptions = [
    {
      value: '',
      label: !selectedSubjectId
        ? dict.selectSubjectFirst
        : units.length === 0
        ? dict.noUnitsAvailable
        : dict.allUnits,
    },
    ...units.map((u) => ({
      value: u.id,
      label: u.title ? `${u.name} — ${u.title}` : u.name,
    })),
  ];

  return (
    <div className="bg-surface border-y md:border md:border-border md:rounded shadow-sm px-4 py-8 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Semester */}
        <div>
          <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] mb-3">
            {dict.semester}
          </label>
          <CustomSelect
            value={selectedSemesterId || ''}
            onChange={(val) => updateParams('semester', val, ['subject', 'unit'])}
            options={semesterOptions}
            placeholder={dict.allSemesters}
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] mb-3">
            {dict.subject}
          </label>
          <CustomSelect
            value={selectedSubjectId || ''}
            onChange={(val) => updateParams('subject', val, ['unit'])}
            options={subjectOptions}
            disabled={!selectedSemesterId}
            placeholder={selectedSemesterId ? dict.allSubjects : dict.selectSemesterFirst}
          />
        </div>

        {/* Unit */}
        <div>
          <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] mb-3">
            {dict.unit}
          </label>
          <CustomSelect
            value={selectedUnitId || ''}
            onChange={(val) => updateParams('unit', val)}
            options={unitOptions}
            disabled={!selectedSubjectId || units.length === 0}
            placeholder={
              !selectedSubjectId
                ? dict.selectSubjectFirst
                : units.length === 0
                ? dict.noUnitsAvailable
                : dict.allUnits
            }
          />
        </div>
      </div>
    </div>
  );
}
