"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ResourceType } from '@prisma/client';

interface StudyOutlineSidebarProps {
  units: {
    id: string;
    name: string;
    title?: string | null;
    resources: { id: string; title: string; type: string }[];
  }[];
  currentResourceId: string;
  currentUnitId?: string | null;
}

const getResourceTypeIcon = (type: string) => {
  switch (type) {
    case 'LAW_NOTE':
      return (
        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.03v13m0-13c-2.819-.831-4.715-1.076-8.029-1.023A.99.99 0 0 0 3 6v11c0 .563.466 1.014 1.03 1.007 3.122-.043 5.018.212 7.97 1.023m0-13c2.819-.831 4.715-1.076 8.029-1.023A.99.99 0 0 1 21 6v11c0 .563-.466 1.014-1.03 1.007-3.122-.043-5.018.212-7.97 1.023" />
        </svg>
      );
    case 'CASE_LAW':
      return (
        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.949 8.949 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
    case 'OLD_QUESTION':
      return (
        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.529 9.988a2.502 2.502 0 1 1 5 .191A2.441 2.441 0 0 1 12 12.582V14m-.01 3.008H12M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-6Zm-1 7V4.5l5.5 5.5H12Z" />
        </svg>
      );
  }
};

export default function StudyOutlineSidebar({ units, currentResourceId, currentUnitId }: StudyOutlineSidebarProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true; // SSR default: open (desktop)
  });
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(currentUnitId ? [currentUnitId] : []));

  const toggleSidebar = () => setIsOpen(!isOpen);

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  return (
    <>
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className={`
        flex flex-col h-full bg-surface transition-all duration-300 z-50
        absolute md:relative left-0 top-0 bottom-0
        ${isOpen
          ? 'w-72 md:w-80 shadow-2xl md:shadow-none border-r border-border'
          : 'w-12 border-r border-border shadow-md md:shadow-none'}
      `}>
      <div className="flex items-center justify-between p-3 border-b border-border">
        {isOpen && <h2 className="font-semibold text-navy dark:text-gray-200 text-sm uppercase tracking-wider">Study Outline</h2>}
        <button
          onClick={toggleSidebar}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:bg-surface-alt rounded-md transition-colors mx-auto"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m14 0-4 4m4-4-4-4" />
            </svg>
          ) : (
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12l4-4m-4 4 4 4" />
            </svg>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {units.map((unit) => (
              <div key={unit.id} className="space-y-1">
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className={`w-full flex items-center justify-between text-left p-2 min-h-[44px] rounded-md transition-colors ${
                    currentUnitId === unit.id ? 'bg-accent/5 text-navy dark:text-blue-300 font-medium' : 'hover:bg-surface-alt text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${expandedUnits.has(unit.id) ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 5 7 7-7 7" />
                    </svg>
                    <span className="text-sm truncate">
                      {unit.name}{unit.title ? `: ${unit.title}` : ''}
                    </span>
                  </div>
                </button>

                {expandedUnits.has(unit.id) && (
                  <div className="ml-6 space-y-1">
                    {unit.resources.map((resource) => {
                      const isCurrent = resource.id === currentResourceId;
                      return (
                        <Link
                          key={resource.id}
                          href={`/read/${resource.id}`}
                          className={`flex items-center gap-2.5 p-2 min-h-[44px] rounded-md text-sm transition-colors ${
                            isCurrent
                              ? 'bg-accent/10 text-accent font-medium'
                              : 'text-text-secondary hover:bg-surface-alt'
                          }`}
                        >
                          <span className={`flex-shrink-0 ${isCurrent ? 'text-accent' : 'text-text-muted'}`}>
                            {getResourceTypeIcon(resource.type)}
                          </span>
                          <span className="truncate">{resource.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
