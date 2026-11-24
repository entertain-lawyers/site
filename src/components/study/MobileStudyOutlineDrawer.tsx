"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, X, ChevronRight, ChevronDown, Scale, FileQuestion, FileText, Library } from 'lucide-react';

interface ResourceItem {
  id: string;
  title: string;
  type: string;
}

interface UnitItem {
  id: string;
  name: string;
  title?: string | null;
  resources: ResourceItem[];
}

interface MobileStudyOutlineDrawerProps {
  units: UnitItem[];
  currentResourceId: string;
  currentUnitId?: string | null;
}

const getResourceTypeIcon = (type: string) => {
  switch (type) {
    case 'LAW_NOTE':
      return <BookOpen className="w-4 h-4" aria-hidden="true" />;
    case 'CASE_LAW':
      return <Scale className="w-4 h-4" aria-hidden="true" />;
    case 'OLD_QUESTION':
      return <FileQuestion className="w-4 h-4" aria-hidden="true" />;
    default:
      return <FileText className="w-4 h-4" aria-hidden="true" />;
  }
};

export default function MobileStudyOutlineDrawer({
  units,
  currentResourceId,
  currentUnitId,
}: MobileStudyOutlineDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    new Set(currentUnitId ? [currentUnitId] : units[0] ? [units[0].id] : [])
  );

  // Close drawer on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  return (
    <>
      {/* Trigger Button visible on mobile & tablet (< lg) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 transition-all min-h-[36px]"
        aria-label="Open syllabus outline navigator"
        title="Syllabus Outline Navigator"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden min-[360px]:inline">Syllabus</span>
      </button>

      {/* Off-canvas Drawer Overlay and Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Syllabus Outline Navigator"
            className="relative w-80 max-w-[85vw] h-full bg-surface dark:bg-zinc-950 border-r border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border bg-surface-alt/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" aria-hidden="true" />
                <h2 className="font-bold text-navy dark:text-white text-sm uppercase tracking-wider">
                  Syllabus Navigator
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-navy dark:hover:text-white hover:bg-surface-alt transition-colors"
                aria-label="Close syllabus navigator"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Units & Resources List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              {units.map((unit) => {
                const isExpanded = expandedUnits.has(unit.id);
                const hasCurrent = unit.resources.some((r) => r.id === currentResourceId);

                return (
                  <div key={unit.id} className="rounded-xl border border-border/70 overflow-hidden bg-surface">
                    <button
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      className={`w-full flex items-center justify-between p-3 text-left min-h-[44px] transition-colors ${
                        hasCurrent
                          ? 'bg-accent/10 text-accent font-bold'
                          : 'hover:bg-surface-alt text-text-primary font-semibold'
                      }`}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
                        )}
                        <span className="text-xs truncate">
                          {unit.name}
                          {unit.title ? `: ${unit.title}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-alt text-text-muted shrink-0 tabular-nums">
                        {unit.resources.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/50 divide-y divide-border/30 bg-surface-alt/30">
                        {unit.resources.map((resource) => {
                          const isCurrent = resource.id === currentResourceId;
                          return (
                            <Link
                              key={resource.id}
                              href={`/read/${resource.id}`}
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] text-xs transition-colors ${
                                isCurrent
                                  ? 'bg-accent text-white font-bold'
                                  : 'text-text-secondary hover:text-navy dark:hover:text-white hover:bg-surface-alt'
                              }`}
                            >
                              <span className={`shrink-0 ${isCurrent ? 'text-white' : 'text-accent'}`}>
                                {getResourceTypeIcon(resource.type)}
                              </span>
                              <span className="truncate flex-1">{resource.title}</span>
                              {isCurrent && (
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white shrink-0">
                                  Current
                                </span>
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
          </div>
        </div>
      )}
    </>
  );
}
