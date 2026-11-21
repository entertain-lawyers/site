'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight, ChevronLeft, FileText, Scale, HelpCircle, Layers } from 'lucide-react';

interface UnitResource {
  id: string;
  title: string;
  type: string;
}

interface UnitItem {
  id: string;
  name?: string;
  title?: string | null;
  order?: number;
  resources: UnitResource[];
}

interface StudyCurriculumSidebarProps {
  semesterName?: string | null;
  subjectName?: string | null;
  subjectId?: string | null;
  currentUnitId?: string | null;
  currentResourceId: string;
  units?: UnitItem[];
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'CASE_LAW':
      return <Scale className="w-3.5 h-3.5 shrink-0 text-amber-500" aria-hidden="true" />;
    case 'OLD_QUESTION':
      return <HelpCircle className="w-3.5 h-3.5 shrink-0 text-purple-500" aria-hidden="true" />;
    default:
      return <FileText className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden="true" />;
  }
};

export default function StudyCurriculumSidebar({
  semesterName,
  subjectName,
  currentUnitId,
  currentResourceId,
  units = [],
}: StudyCurriculumSidebarProps) {
  // All resources flattened across all units in order
  const allResources: { resource: UnitResource; unitName: string }[] = units.flatMap((u) =>
    (u.resources || []).map((r) => ({
      resource: r,
      unitName: u.name || u.title || 'Unit',
    }))
  );

  const currentIndex = allResources.findIndex((item) => item.resource.id === currentResourceId);
  const prevItem = currentIndex > 0 ? allResources[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < allResources.length - 1 ? allResources[currentIndex + 1] : null;

  // Track expanded units. Default to expanding the unit of the current resource
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (currentUnitId) initial.add(currentUnitId);
    units.forEach((u) => {
      if (u.resources?.some((r) => r.id === currentResourceId)) {
        initial.add(u.id);
      }
    });
    // If none matched, expand first 2 units
    if (initial.size === 0 && units.length > 0) {
      initial.add(units[0].id);
      if (units.length > 1) initial.add(units[1].id);
    }
    return initial;
  });

  const toggleUnit = (id: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalNotes = allResources.length;

  return (
    <nav aria-labelledby="curriculum-sidebar-heading" className="space-y-4">
      {/* Main Companion Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        {/* Header */}
        <div className="border-b border-border/70 pb-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="curriculum-sidebar-heading" className="text-sm font-bold uppercase tracking-wider text-navy dark:text-white">
                Syllabus Navigator
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {semesterName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/10 text-accent">
                {semesterName}
              </span>
            )}
            {subjectName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-alt border border-border text-text-secondary truncate max-w-[200px]" title={subjectName}>
                {subjectName}
              </span>
            )}
          </div>

          {totalNotes > 0 && (
            <p className="text-[11px] text-text-muted mt-2">
              {units.length} {units.length === 1 ? 'Unit' : 'Units'} • {totalNotes} {totalNotes === 1 ? 'Topic' : 'Topics'}
            </p>
          )}
        </div>

        {/* Quick Prev / Next topic pills */}
        {(prevItem || nextItem) && (
          <div className="mb-4 space-y-2 pb-4 border-b border-border/60">
            {nextItem && (
              <Link
                href={`/read/${nextItem.resource.id}`}
                className="group flex items-center justify-between gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-all"
                title={`Next: ${nextItem.resource.title}`}
              >
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-white/80 font-medium">
                    Next in Syllabus
                  </span>
                  <span className="truncate block font-semibold text-xs">
                    {nextItem.resource.title}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}

            {prevItem && (
              <Link
                href={`/read/${prevItem.resource.id}`}
                className="group flex items-center gap-1.5 px-1 py-1 text-xs text-text-muted hover:text-accent transition-colors"
                title={`Previous: ${prevItem.resource.title}`}
              >
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                <span className="truncate text-[11px]">Prev: {prevItem.resource.title}</span>
              </Link>
            )}
          </div>
        )}

        {/* Units List */}
        {units.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-muted">
            <Layers className="h-8 w-8 mx-auto mb-2 text-text-muted opacity-40" />
            <p>No additional units listed for this subject.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {units.map((unit, uIdx) => {
              const isExpanded = expandedUnits.has(unit.id);
              const unitTitle = unit.title || unit.name || `Unit ${uIdx + 1}`;
              const hasCurrent = unit.resources?.some((r) => r.id === currentResourceId);

              return (
                <div
                  key={unit.id}
                  className={`rounded-xl border transition-all ${
                    hasCurrent
                      ? 'border-accent/40 bg-accent/[0.02]'
                      : 'border-border/70 bg-surface-alt/20 hover:border-border'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleUnit(unit.id)}
                    className="flex w-full items-center justify-between p-3 text-left transition-colors cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0 pr-2">
                      <span className={`block text-xs font-bold truncate ${hasCurrent ? 'text-accent' : 'text-navy dark:text-white'}`}>
                        {unitTitle}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {unit.resources?.length || 0} {(unit.resources?.length || 0) === 1 ? 'topic' : 'topics'}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-accent' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {isExpanded && unit.resources && unit.resources.length > 0 && (
                    <div className="px-2 pb-2.5 pt-0 space-y-1 border-t border-border/40 mt-1">
                      {unit.resources.map((r) => {
                        const isCurrent = r.id === currentResourceId;
                        return (
                          <Link
                            key={r.id}
                            href={`/read/${r.id}`}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                              isCurrent
                                ? 'bg-accent text-white font-bold shadow-xs'
                                : 'text-text-secondary hover:bg-surface-alt hover:text-navy dark:hover:text-white'
                            }`}
                          >
                            <span className={isCurrent ? 'text-white' : ''}>
                              {getResourceIcon(r.type)}
                            </span>
                            <span className="truncate flex-1 min-w-0">{r.title}</span>
                            {isCurrent && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Back to Study Link */}
        <div className="mt-5 pt-4 border-t border-border/60">
          <Link
            href="/study"
            className="block text-center rounded-xl border border-border bg-surface-alt/40 py-2.5 px-3 text-xs font-bold text-navy dark:text-white hover:border-accent hover:text-accent transition-colors"
          >
            All Subjects & Syllabus &rarr;
          </Link>
        </div>
      </div>
    </nav>
  );
}
