'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Scale,
  X,
  BookOpen,
  Filter,
  Eye,
  Download,
  FileText,
  Lock,
  LockOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { searchMatches } from '@/lib/translit-search';
import {
  getCaseCategory,
  getCaseLawCategory,
  formatCaseLawCategory,
} from '@/lib/case-category';
import CaseLawCategoryBadge from '@/components/study/CaseLawCategoryBadge';
import { m } from '@/components/motion/primitives';
import { springSnappy } from '@/lib/motion';

export interface PrescribedCaseItem {
  id: string;
  title: string;
  content: string | null;
  metaTitle: string | null;
  metaDesc?: string | null;
  documentId: string | null;
  document?: {
    id: string;
    fileSize: number | null;
    mimeType: string;
  } | null;
  isPremium: boolean;
  priceAmount: number | null;
  currency?: string | null;
  order?: number | null;
  author?: {
    name: string | null;
    image: string | null;
    bio: string | null;
    role: string | null;
    website: string | null;
    email: string | null;
  } | null;
  createdBy?: {
    name: string | null;
    image: string | null;
    bio: string | null;
    role: string | null;
    website: string | null;
    email: string | null;
  } | null;
  canAccess?: boolean;
}

interface PrescribedCasesViewProps {
  cases: PrescribedCaseItem[];
  unitName: string;
  unitTitle?: string | null;
  subjectName?: string | null;
  semesterName?: string | null;
  initialCategory?: string | null;
}

export type FilterOption = 'ALL' | 'NEW_CASE' | 'OLD_CASE' | 'BOTH_CASES';

const ITEMS_PER_PAGE = 10; // 5 per column on desktop for a balanced 2-column layout matching Acts & Laws

export default function PrescribedCasesView({
  cases,
  unitName,
  unitTitle,
  subjectName,
  semesterName,
  initialCategory,
}: PrescribedCasesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [prevInitialCategory, setPrevInitialCategory] = useState(initialCategory);
  const [filter, setFilter] = useState<FilterOption>(() => {
    if (initialCategory === 'NEW_CASE' || initialCategory === 'OLD_CASE' || initialCategory === 'BOTH_CASES') {
      return initialCategory;
    }
    return 'ALL';
  });

  if (initialCategory !== prevInitialCategory) {
    setPrevInitialCategory(initialCategory);
    setFilter(
      initialCategory === 'NEW_CASE' || initialCategory === 'OLD_CASE' || initialCategory === 'BOTH_CASES'
        ? initialCategory
        : 'ALL'
    );
    setCurrentPage(1);
  }

  // 1. Cases matching the search query (if any)
  const searchFilteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.trim();
    return cases.filter((item) => {
      const matchesTitle = searchMatches(item.title, q);
      const matchesDesc = item.metaDesc ? searchMatches(item.metaDesc, q) : false;
      const matchesContent = item.content
        ? searchMatches(item.content.substring(0, 1000), q)
        : false;
      const lawCat = getCaseLawCategory(item);
      const matchesLawCat = lawCat
        ? searchMatches(lawCat, q) || searchMatches(formatCaseLawCategory(lawCat) || '', q)
        : false;
      const caseCat = getCaseCategory(item);
      const matchesCaseCat = caseCat
        ? searchMatches(caseCat, q) ||
          searchMatches(caseCat === 'NEW_CASE' ? 'New Syllabus' : caseCat === 'OLD_CASE' ? 'Old Syllabus' : 'Both Syllabus', q)
        : false;

      return matchesTitle || matchesDesc || matchesContent || matchesLawCat || matchesCaseCat;
    });
  }, [cases, searchQuery]);

  // 2. Counts for filter pills (based on search-matching cases so counts and records always agree)
  const allCasesCount = searchFilteredCases.length;
  const newCasesCount = useMemo(
    () =>
      searchFilteredCases.filter((c) => {
        const cat = getCaseCategory(c);
        return cat === 'NEW_CASE' || cat === 'BOTH_CASES';
      }).length,
    [searchFilteredCases]
  );
  const oldCasesCount = useMemo(
    () =>
      searchFilteredCases.filter((c) => {
        const cat = getCaseCategory(c);
        return cat === 'OLD_CASE' || cat === 'BOTH_CASES';
      }).length,
    [searchFilteredCases]
  );
  const bothCasesCount = useMemo(
    () => searchFilteredCases.filter((c) => getCaseCategory(c) === 'BOTH_CASES').length,
    [searchFilteredCases]
  );

  // 3. Filtered cases by active syllabus category and sorted Alphabetically A-Z
  const filteredCases = useMemo(() => {
    let result: PrescribedCaseItem[] = [];
    if (filter === 'NEW_CASE') {
      result = searchFilteredCases.filter((item) => {
        const cat = getCaseCategory(item);
        return cat === 'NEW_CASE' || cat === 'BOTH_CASES';
      });
    } else if (filter === 'OLD_CASE') {
      result = searchFilteredCases.filter((item) => {
        const cat = getCaseCategory(item);
        return cat === 'OLD_CASE' || cat === 'BOTH_CASES';
      });
    } else if (filter === 'BOTH_CASES') {
      result = searchFilteredCases.filter((item) => {
        const cat = getCaseCategory(item);
        return cat === 'BOTH_CASES';
      });
    } else {
      // 'ALL' includes all search-matching cases, including unclassified legacy cases
      result = [...searchFilteredCases];
    }

    // Syllabus order: the admin-set order within the unit; ties keep the DB order.
    result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return result;
  }, [searchFilteredCases, filter]);

  // Reset page when filter changes
  const handleFilterChange = (nextFilter: FilterOption) => {
    setFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilter('ALL');
    setCurrentPage(1);
  };

  // Pagination calculation matching Acts & Laws
  const totalItems = filteredCases.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCases = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCases.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCases, validCurrentPage]);

  // Zigzag numbering matching Acts & Laws: 1 left, 2 right, 3 left, 4 right…
  const leftColumnCases: { item: PrescribedCaseItem; index: number }[] = [];
  const rightColumnCases: { item: PrescribedCaseItem; index: number }[] = [];

  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  paginatedCases.forEach((item, i) => {
    const itemIndex = startIndex + i + 1;
    if (itemIndex % 2 === 1) {
      leftColumnCases.push({ item, index: itemIndex });
    } else {
      rightColumnCases.push({ item, index: itemIndex });
    }
  });

  const handleDownload = (item: PrescribedCaseItem) => {
    if (!item.documentId && !item.document) {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/read/${item.id}`);
      }
      return;
    }
    const a = document.createElement('a');
    a.href = `/api/documents/${item.id}/pdf`;
    a.download = `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const syllabusFilterLabel =
    filter === 'NEW_CASE'
      ? 'New Syllabus'
      : filter === 'OLD_CASE'
        ? 'Old Syllabus'
        : filter === 'BOTH_CASES'
          ? 'Both Syllabus'
          : '';

  return (
    <div className="space-y-6" data-testid="prescribed-cases-view">
      {/* Top Hero Banner matching Acts & Laws layout */}
      <div className="relative rounded-3xl border border-border/70 dark:border-white/10 bg-white dark:bg-zinc-900/60 backdrop-blur-md pt-8 pb-8 px-4 sm:px-6 lg:px-8 text-center shadow-xs">
        <div className="max-w-3xl mx-auto">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent dark:text-accent-light text-xs font-bold mb-3">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {unitName || 'Prescribed Cases'}
              {subjectName ? ` • ${subjectName}` : ''}
              {semesterName ? ` • ${semesterName}` : ''}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-navy dark:text-white">
            {unitTitle || 'Prescribed Landmark Cases'}
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-sm sm:text-base text-text-secondary dark:text-zinc-400 font-medium max-w-2xl mx-auto">
            Syllabus wise judicial precedents, constitutional rulings, and case summaries explained in simple, easy to understand language.
          </p>

          <div className="mt-2 text-xs font-bold text-text-muted">
            Total: <strong className="text-navy dark:text-white">{allCasesCount}</strong> Cases
          </div>

          {/* Controls Bar: Search Input & Short List Dropdown Filter */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search case name, number, or summary..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900 text-sm font-medium text-navy dark:text-white shadow-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Short List Dropdown Filter matching Acts & Laws */}
            <div className="relative sm:w-60">
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value as FilterOption)}
                  aria-label="Short list filter"
                  className="w-full appearance-none rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900 pl-4 pr-10 py-3.5 text-sm font-bold text-navy dark:text-white shadow-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer"
                >
                  <option value="ALL">Short list: All</option>
                  <option value="NEW_CASE">New Syllabus</option>
                  <option value="OLD_CASE">Old Syllabus</option>
                  <option value="BOTH_CASES">Both Syllabus</option>
                </select>
                <Filter
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-accent"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="mt-5 flex items-center justify-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleFilterChange('ALL')}
              className={`relative isolate text-xs px-3.5 py-1.5 rounded-full font-bold transition-colors ${
                filter === 'ALL'
                  ? 'text-white'
                  : 'bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary'
              }`}
            >
              {filter === 'ALL' && (
                <m.span
                  layoutId="prescribed-case-pill"
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-accent shadow-sm"
                  transition={springSnappy}
                />
              )}
              All Cases ({allCasesCount})
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange('NEW_CASE')}
              className={`relative isolate text-xs px-3.5 py-1.5 rounded-full font-bold transition-colors ${
                filter === 'NEW_CASE'
                  ? 'text-white'
                  : 'bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary'
              }`}
            >
              {filter === 'NEW_CASE' && (
                <m.span
                  layoutId="prescribed-case-pill"
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-accent shadow-sm"
                  transition={springSnappy}
                />
              )}
              <span className="sr-only">New Cases ({newCasesCount})</span>
              <span>New Syllabus ({newCasesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange('OLD_CASE')}
              className={`relative isolate text-xs px-3.5 py-1.5 rounded-full font-bold transition-colors ${
                filter === 'OLD_CASE'
                  ? 'text-white'
                  : 'bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary'
              }`}
            >
              {filter === 'OLD_CASE' && (
                <m.span
                  layoutId="prescribed-case-pill"
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-accent shadow-sm"
                  transition={springSnappy}
                />
              )}
              <span className="sr-only">Old Cases ({oldCasesCount})</span>
              <span>Old Syllabus ({oldCasesCount})</span>
            </button>

            {bothCasesCount > 0 && (
              <button
                type="button"
                onClick={() => handleFilterChange('BOTH_CASES')}
                className={`relative isolate text-xs px-3.5 py-1.5 rounded-full font-bold transition-colors ${
                  filter === 'BOTH_CASES'
                    ? 'text-white'
                    : 'bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter === 'BOTH_CASES' && (
                  <m.span
                    layoutId="prescribed-case-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-accent shadow-sm"
                    transition={springSnappy}
                  />
                )}
                <span className="sr-only">Both Cases ({bothCasesCount})</span>
                <span>Both Syllabus ({bothCasesCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-2">
        {/* Results Counter matching Acts & Laws */}
        <div className="flex items-center justify-between text-xs text-text-muted mb-6 px-1">
          <span className="font-semibold">
            Showing <strong className="text-navy dark:text-white">{filteredCases.length}</strong> Prescribed Cases
            {syllabusFilterLabel && ` in ${syllabusFilterLabel}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
        </div>

        {/* 2-Column Grid Layout matching Acts & Laws */}
        {paginatedCases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {/* Left Column (Items 1, 3, 5...) */}
            <div className="space-y-4">
              {leftColumnCases.map(({ item, index }) => (
                <PrescribedCaseCard
                  key={item.id}
                  item={item}
                  index={index}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>

            {/* Right Column (Items 2, 4, 6...) */}
            <div className="space-y-4">
              {rightColumnCases.map(({ item, index }) => (
                <PrescribedCaseCard
                  key={item.id}
                  item={item}
                  index={index}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/10 p-12 text-center max-w-lg mx-auto shadow-sm">
            <BookOpen className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
            <h3 className="text-lg font-bold text-navy dark:text-white">No prescribed cases found</h3>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              {searchQuery
                ? `No legal cases match your search "${searchQuery}". Try another keyword or reset your filter.`
                : 'There are no cases published in this category yet.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Pagination matching Acts & Laws: (1) (2) (3) [Next] */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              aria-label="Previous page"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-bold text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                className={`inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-bold transition-all ${
                  validCurrentPage === pageNumber
                    ? 'bg-accent text-white shadow-md shadow-accent/20 scale-105'
                    : 'border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-sm'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              aria-label="Next page"
              className="inline-flex items-center gap-1 px-4 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-bold text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Single Prescribed Case Card matching the Acts & Laws sketch
function PrescribedCaseCard({
  item,
  index,
  onDownload,
}: {
  item: PrescribedCaseItem;
  index: number;
  onDownload: () => void;
}) {
  const cat = getCaseCategory(item);
  const caseLawCat = getCaseLawCategory(item);

  const syllabusLabel =
    cat === 'NEW_CASE'
      ? 'New Syllabus'
      : cat === 'OLD_CASE'
        ? 'Old Syllabus'
        : cat === 'BOTH_CASES'
          ? 'Both Syllabus'
          : 'Prescribed Case';

  const hasDocument = Boolean(item.documentId || item.document);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 sm:p-3.5 shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200">
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Index number bubble */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 dark:bg-accent/15 text-accent dark:text-accent-light font-extrabold text-xs shadow-xs">
          {index}
        </div>

        {/* Title and metadata */}
        <div className="flex-1 min-w-0 pr-1">
          <h2 className="text-sm sm:text-base font-extrabold text-navy dark:text-white leading-snug group-hover:text-accent transition-colors line-clamp-2">
            <Link href={`/resources/${item.id}`} className="hover:text-accent transition-colors">
              {item.title}
            </Link>
          </h2>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-text-secondary dark:text-zinc-300 border border-black/5 dark:border-white/5">
              {syllabusLabel}
            </span>

            {/* Preserving hidden data markers for testing parity */}
            <span className="hidden" data-case-category={cat || undefined} />

            {/* Case Law classification badge (Civil, Criminal, Writ) */}
            {caseLawCat && (
              <CaseLawCategoryBadge category={caseLawCat} size="sm" />
            )}

            {hasDocument && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <FileText className="h-3 w-3" aria-hidden="true" />
                PDF
              </span>
            )}

            {item.isPremium ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                Premium (Rs. {(item.priceAmount || 0) / 100})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border border-green-200 dark:border-green-800/40 uppercase tracking-wider">
                <LockOpen className="w-3 h-3" />
                Free
              </span>
            )}
          </div>

          {item.metaDesc && (
            <p className="mt-1.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
              {item.metaDesc}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons: [View] [Download / Read Note] matching Acts & Laws */}
      <div className="mt-3 pt-2.5 border-t border-border/40 dark:border-white/5 flex items-center justify-end gap-2">
        <Link
          href={`/resources/${item.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/80 text-xs font-bold text-navy dark:text-white hover:border-accent hover:text-accent dark:hover:border-accent transition-all active:scale-[0.98]"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>View</span>
        </Link>

        {hasDocument ? (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-hover shadow-xs transition-all active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download</span>
          </button>
        ) : (
          <Link
            href={`/read/${item.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-hover shadow-xs transition-all active:scale-[0.98]"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Read Note</span>
          </Link>
        )}
      </div>
    </div>
  );
}
