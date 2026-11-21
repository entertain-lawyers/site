'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Layers,
  Minimize2,
  Maximize2,
} from 'lucide-react';

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

const formatUnitLabel = (unit: UnitItem, uIdx: number) => {
  const rawName = (unit.name || '').trim();
  const rawTitle = (unit.title || '').trim();
  const fallbackName = `Unit ${uIdx + 1}`;

  if (!rawName && !rawTitle) return fallbackName;
  if (!rawTitle) return rawName;
  if (!rawName) return `${fallbackName}: ${rawTitle}`;

  // If unit.name already includes the title text, don't duplicate
  if (rawName.toLowerCase().includes(rawTitle.toLowerCase())) {
    return rawName;
  }

  // Format as "Unit: It's Title"
  return `${rawName}: ${rawTitle}`;
};

export default function StudyCurriculumSidebar({
  semesterName,
  subjectName,
  subjectId,
  currentUnitId,
  currentResourceId,
  units = [],
}: StudyCurriculumSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // All resources flattened across all units in order for sequential Next/Prev traversal
  const allResources: { resource: UnitResource; unitName: string }[] = units.flatMap((u) =>
    (u.resources || []).map((r) => ({
      resource: r,
      unitName: u.name || u.title || 'Unit',
    }))
  );

  const currentIndex = allResources.findIndex((item) => item.resource.id === currentResourceId);
  const prevItem = currentIndex > 0 ? allResources[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < allResources.length - 1 ? allResources[currentIndex + 1] : null;

  // When minimized: render an ultra-compact single-row pill card
  if (isMinimized) {
    return (
      <nav aria-labelledby="curriculum-sidebar-heading" className="w-full">
        <div className="rounded-2xl border border-border bg-surface p-3 shadow-xs hover:border-accent/60 transition-colors">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex w-full items-center justify-between gap-2 text-left cursor-pointer group"
            aria-expanded={false}
            title="Expand Syllabus Navigator"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span id="curriculum-sidebar-heading" className="text-xs font-bold text-navy dark:text-white truncate">
                    Syllabus Navigator
                  </span>
                  {units.length > 0 && (
                    <span className="text-[10px] font-semibold text-accent px-1.5 py-0.2 rounded-full bg-accent/10">
                      {units.length} {units.length === 1 ? 'unit' : 'units'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-muted truncate">
                  {subjectName ? `${subjectName} • ` : ''}Click to view units
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent bg-accent/10 group-hover:bg-accent group-hover:text-white transition-all shrink-0">
              <span className="text-[11px]">Open</span>
              <Maximize2 className="h-3 w-3" aria-hidden="true" />
            </div>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-labelledby="curriculum-sidebar-heading" className="w-full">
      {/* Main Companion Card: constrained to viewport height with internal scroll */}
      <div className="flex flex-col max-h-[calc(100vh-7rem)] rounded-2xl border border-border bg-surface p-3.5 sm:p-4 shadow-xs transition-all">
        {/* Header (Compact) */}
        <div className="border-b border-border/70 pb-3 mb-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="curriculum-sidebar-heading" className="text-xs font-bold uppercase tracking-wider text-navy dark:text-white truncate">
                  Syllabus Navigator
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {units.length > 0 && (
                <span className="text-[10px] font-bold text-text-muted bg-surface-alt px-1.5 py-0.5 rounded-full border border-border">
                  {units.length} {units.length === 1 ? 'unit' : 'units'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-lg text-text-muted hover:text-accent hover:bg-surface-alt transition-colors cursor-pointer"
                title="Minimize navigator into compact mode"
                aria-label="Minimize navigator into compact mode"
              >
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Badges */}
          {(semesterName || subjectName) && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {semesterName && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-accent/10 text-accent">
                  {semesterName}
                </span>
              )}
              {subjectName && (
                <span
                  className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-surface-alt border border-border text-text-secondary truncate max-w-[200px]"
                  title={subjectName}
                >
                  {subjectName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Prev / Next topic pills (Compact) */}
        {(prevItem || nextItem) && (
          <div className="mb-2.5 space-y-1.5 pb-2.5 border-b border-border/60 shrink-0">
            {nextItem && (
              <Link
                href={`/read/${nextItem.resource.id}`}
                className="group flex items-center justify-between gap-2 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-all"
                title={`Next: ${nextItem.resource.title}`}
              >
                <div className="min-w-0">
                  <span className="block text-[9px] uppercase tracking-wider text-white/80 font-medium leading-tight">
                    Next in Syllabus
                  </span>
                  <span className="truncate block font-semibold text-[11px] leading-tight">
                    {nextItem.resource.title}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}

            {prevItem && (
              <Link
                href={`/read/${prevItem.resource.id}`}
                className="group flex items-center gap-1 px-1 text-[10px] text-text-muted hover:text-accent transition-colors"
                title={`Previous: ${prevItem.resource.title}`}
              >
                <ChevronLeft className="h-3 w-3 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                <span className="truncate">Prev: {prevItem.resource.title}</span>
              </Link>
            )}
          </div>
        )}

        {/* Units List (Directly Clickable Unit Pills - No Dropdowns) */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-0.5 space-y-1.5 [scrollbar-width:thin]">
          {units.length === 0 ? (
            <div className="text-center py-4 text-xs text-text-muted">
              <Layers className="h-6 w-6 mx-auto mb-1.5 text-text-muted opacity-40" />
              <p className="text-[11px]">No units listed for this subject.</p>
            </div>
          ) : (
            units.map((unit, uIdx) => {
              const unitLabel = formatUnitLabel(unit, uIdx);
              const hasCurrent =
                unit.id === currentUnitId ||
                unit.resources?.some((r) => r.id === currentResourceId);

              const targetResourceId = hasCurrent
                ? currentResourceId
                : unit.resources?.[0]?.id;

              const href = targetResourceId
                ? `/read/${targetResourceId}`
                : subjectId
                  ? `/study?subject=${subjectId}&unit=${unit.id}`
                  : '/study';

              return (
                <Link
                  key={unit.id}
                  href={href}
                  aria-current={hasCurrent ? 'page' : undefined}
                  title={unitLabel}
                  className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-all ${
                    hasCurrent
                      ? 'bg-accent text-white font-bold shadow-xs border border-accent'
                      : 'bg-accent/5 text-navy dark:text-white border border-accent/20 hover:bg-accent hover:text-white hover:border-accent font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        hasCurrent
                          ? 'text-white'
                          : 'text-accent group-hover:text-white'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate block font-semibold text-[11px] leading-tight">
                      {unitLabel}
                    </span>
                  </div>

                  {hasCurrent ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0"
                      aria-label="Current Unit"
                    />
                  ) : (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-text-muted group-hover:text-white transition-all group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Back to Study Link (Compact Footer) */}
        <div className="mt-2.5 pt-2 border-t border-border/60 shrink-0">
          <Link
            href="/study"
            className="block text-center rounded-lg border border-border bg-surface-alt/40 py-1.5 px-2 text-[11px] font-bold text-navy dark:text-white hover:border-accent hover:text-accent transition-colors"
          >
            All Subjects &amp; Syllabus &rarr;
          </Link>
        </div>
      </div>
    </nav>
  );
}
