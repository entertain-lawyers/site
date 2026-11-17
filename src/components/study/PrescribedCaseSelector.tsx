'use client';

import Link from 'next/link';
import { Sparkles, History, ArrowRight, Scale } from 'lucide-react';
import { CASE_CATEGORIES } from '@/lib/case-category';
import { Reveal } from '@/components/motion/primitives';

interface PrescribedCaseSelectorProps {
  semesterId: string;
  subjectId: string;
  unitId: string;
  subjectName?: string;
  semesterName?: string;
  newCasesCount?: number;
  oldCasesCount?: number;
}

export default function PrescribedCaseSelector({
  semesterId,
  subjectId,
  unitId,
  subjectName,
  semesterName,
  newCasesCount = 0,
  oldCasesCount = 0,
}: PrescribedCaseSelectorProps) {
  const newCaseHref = `/study?semester=${semesterId}&subject=${subjectId}&unit=${unitId}&caseCategory=NEW_CASE`;
  const oldCaseHref = `/study?semester=${semesterId}&subject=${subjectId}&unit=${unitId}&caseCategory=OLD_CASE`;

  return (
    <div className="w-full">
      {/* Header Context */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            <Scale className="w-3.5 h-3.5 text-accent" />
            <span>Prescribed Precedents</span>
            {semesterName && (
              <>
                <span>•</span>
                <span>{semesterName}</span>
              </>
            )}
            {subjectName && (
              <>
                <span>•</span>
                <span>{subjectName}</span>
              </>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-navy dark:text-white tracking-tight">
            Select Case Classification
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Choose whether to explore newly prescribed case laws or established historical precedents for this unit.
          </p>
        </div>
      </div>

      {/* Two distinct, visually consistent options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NEW CASE OPTION */}
        <Reveal index={0} perRow={2} lift className="h-full">
          <Link
            href={newCaseHref}
            className="group relative flex flex-col bg-surface border-2 border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-7 hover:border-emerald-500 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all duration-300 h-full overflow-hidden"
            data-testid="prescribed-case-option-new"
          >
            {/* Top decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-90" />

            <div className="flex items-start justify-between mb-5">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50 tracking-wider uppercase">
                {newCasesCount} {newCasesCount === 1 ? 'Case' : 'Cases'} Available
              </span>
            </div>

            <h3 className="text-xl font-bold text-navy dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2 tracking-tight">
              {CASE_CATEGORIES.NEW_CASE.label}
            </h3>

            <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-1">
              {CASE_CATEGORIES.NEW_CASE.description}
            </p>

            <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Browse New Cases
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Open Precedents</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </Reveal>

        {/* OLD CASE OPTION */}
        <Reveal index={1} perRow={2} lift className="h-full">
          <Link
            href={oldCaseHref}
            className="group relative flex flex-col bg-surface border-2 border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-7 hover:border-amber-500 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] transition-all duration-300 h-full overflow-hidden"
            data-testid="prescribed-case-option-old"
          >
            {/* Top decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-400 opacity-90" />

            <div className="flex items-start justify-between mb-5">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <History className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50 tracking-wider uppercase">
                {oldCasesCount} {oldCasesCount === 1 ? 'Case' : 'Cases'} Available
              </span>
            </div>

            <h3 className="text-xl font-bold text-navy dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-2 tracking-tight">
              {CASE_CATEGORIES.OLD_CASE.label}
            </h3>

            <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-1">
              {CASE_CATEGORIES.OLD_CASE.description}
            </p>

            <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Browse Old Cases
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Open Precedents</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
