'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import CustomSelect from './CustomSelect';
import { isPrescribedCasesUnit } from '@/lib/case-category';
import { Sparkles, History, Scale, BookmarkCheck } from 'lucide-react';

interface SelectorOption {
  id: string;
  name: string;
}

export interface UnitOption extends SelectorOption {
  title?: string | null;
  resourceCount?: number;
  singleResourceId?: string | null;
  singleResourceTitle?: string | null;
  newCaseCount?: number;
  oldCaseCount?: number;
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
  selectedCaseCategory?: string;
}

export default function StudySelector({
  dict,
  semesters,
  subjects,
  units,
  selectedSemesterId,
  selectedSubjectId,
  selectedUnitId,
  selectedCaseCategory,
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

  const selectedType = searchParams.get('type');
  const isOldQuestion = selectedType === 'OLD_QUESTION';

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

  const currentUnit = units.find((u) => u.id === selectedUnitId);
  const isCasesUnit = currentUnit && isPrescribedCasesUnit(currentUnit);

  const handleUnitChange = (val: string) => {
    if (!val) {
      updateParams('unit', '', ['caseCategory']);
      return;
    }
    const chosenUnit = units.find((u) => u.id === val);
    // DIRECT UNIT NAVIGATION: If ordinary unit has a single resource, navigate directly to that resource!
    if (chosenUnit && !isPrescribedCasesUnit(chosenUnit) && chosenUnit.singleResourceId) {
      router.push(`/resources/${chosenUnit.singleResourceId}`);
      return;
    }
    updateParams('unit', val, ['caseCategory']);
  };

  return (
    <div>
      <div className={`grid grid-cols-1 ${isOldQuestion ? 'sm:grid-cols-1 lg:grid-cols-1 max-w-sm mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-6 md:gap-8`}>
        {/* Semester */}
        <div>
          <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] mb-3">
            {dict.semester}
          </label>
          <CustomSelect
            value={selectedSemesterId || ''}
            onChange={(val) => updateParams('semester', val, ['subject', 'unit', 'caseCategory'])}
            options={semesterOptions}
            placeholder={dict.allSemesters}
          />
        </div>

        {/* Subject */}
        {!isOldQuestion && (
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] mb-3">
              {dict.subject}
            </label>
            <CustomSelect
              value={selectedSubjectId || ''}
              onChange={(val) => updateParams('subject', val, ['unit', 'caseCategory'])}
              options={subjectOptions}
              disabled={!selectedSemesterId}
              placeholder={selectedSemesterId ? dict.allSubjects : dict.selectSemesterFirst}
            />
          </div>
        )}

        {/* Unit */}
        {!isOldQuestion && (
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] mb-3">
              {dict.unit}
            </label>
            <CustomSelect
              value={selectedUnitId || ''}
              onChange={handleUnitChange}
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
        )}
      </div>

      {/* Case Classification selector when Prescribed Cases unit is selected */}
      {isCasesUnit && (
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-accent" />
              Case Classification:
            </span>
            <div className="inline-flex p-0.5 bg-surface-alt rounded-lg border border-border">
              <button
                type="button"
                onClick={() => updateParams('caseCategory', '')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  !selectedCaseCategory
                    ? 'bg-surface text-navy dark:text-white shadow-2xs font-bold'
                    : 'text-text-secondary hover:text-navy dark:hover:text-white'
                }`}
              >
                All Options
              </button>
              <button
                type="button"
                onClick={() => updateParams('caseCategory', 'NEW_CASE')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCaseCategory === 'NEW_CASE'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-text-secondary hover:text-emerald-600'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>New Syllabus</span>
              </button>
              <button
                type="button"
                onClick={() => updateParams('caseCategory', 'OLD_CASE')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCaseCategory === 'OLD_CASE'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-text-secondary hover:text-amber-600'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Old Syllabus</span>
              </button>
              <button
                type="button"
                onClick={() => updateParams('caseCategory', 'BOTH_CASES')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCaseCategory === 'BOTH_CASES'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-text-secondary hover:text-indigo-600'
                }`}
              >
                <BookmarkCheck className="w-3 h-3" />
                <span>Both Syllabus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
