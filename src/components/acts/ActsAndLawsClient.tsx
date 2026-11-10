'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Eye,
  Download,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Check,
  FileText,
} from 'lucide-react';
import { ACT_CATEGORIES } from '@/modules/acts/act.constants';

export interface ActItem {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  category: string;
  description: string | null;
  documentUrl: string | null;
  fileSize: number | null;
  publishDate: Date | string | null;
  status: string;
}

interface ActsAndLawsClientProps {
  initialActs: ActItem[];
}

// 6 items per page matching the handwritten sketch (1, 2, 3 on left; 4, 5, 6 on right)
const ITEMS_PER_PAGE = 6;

export default function ActsAndLawsClient({ initialActs }: ActsAndLawsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isShortListOpen, setIsShortListOpen] = useState(false);
  const [viewingAct, setViewingAct] = useState<ActItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const shortListRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shortListRef.current && !shortListRef.current.contains(event.target as Node)) {
        setIsShortListOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Category mapping
  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    ACT_CATEGORIES.forEach((c) => map.set(c.value, c.label));
    return map;
  }, []);

  // Filter and sort items strictly in Alphabetical order A-Z
  const filteredActs = useMemo(() => {
    let result = [...initialActs];

    if (selectedCategory !== 'ALL') {
      result = result.filter((act) => act.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (act) =>
          act.title.toLowerCase().includes(q) ||
          (act.titleEn && act.titleEn.toLowerCase().includes(q)) ||
          act.slug.toLowerCase().includes(q) ||
          (act.description && act.description.toLowerCase().includes(q))
      );
    }

    // Alphabetical sort (A-Z)
    result.sort((a, b) => a.title.localeCompare(b.title, 'ne-NP', { sensitivity: 'base' }));

    return result;
  }, [initialActs, selectedCategory, searchQuery]);

  // Reset page when filtering
  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setIsShortListOpen(false);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalItems = filteredActs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedActs = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredActs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredActs, validCurrentPage]);

  // Split into left (1, 2, 3) and right (4, 5, 6) columns matching sketch layout
  const leftColumnActs: { act: ActItem; index: number }[] = [];
  const rightColumnActs: { act: ActItem; index: number }[] = [];

  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  paginatedActs.forEach((act, i) => {
    const itemIndex = startIndex + i + 1;
    // Top 3 in left column (1, 2, 3), next 3 in right column (4, 5, 6)
    if (i < 3) {
      leftColumnActs.push({ act, index: itemIndex });
    } else {
      rightColumnActs.push({ act, index: itemIndex });
    }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownload = (act: ActItem) => {
    if (!act.documentUrl) {
      showToast(`Document for "${act.title}" is being digitized and will be available soon.`);
      return;
    }
    const a = document.createElement('a');
    a.href = act.documentUrl;
    a.download = `${act.slug || 'document'}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleView = (act: ActItem) => {
    setViewingAct(act);
  };

  return (
    <div className="min-h-screen bg-background text-navy dark:text-white pt-8 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title & Subtitle matching the handwritten sketch */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold tracking-tight text-navy dark:text-white font-mukta">
            Acts and Laws
          </h1>
          <p className="mt-2 text-base sm:text-lg text-text-secondary dark:text-zinc-300 font-medium max-w-xl mx-auto leading-snug">
            Get all the important Acts Laws &amp; Regulations
            <span className="block">in Alphabetical order</span>
          </p>
        </div>

        {/* Search & Short List controls aligned to the right (above column 2 as in sketch) */}
        <div className="mt-6 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          {/* Active filter badge if any */}
          {selectedCategory !== 'ALL' && (
            <div className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-bold text-accent">
              <span>Category: {categoryLabelMap.get(selectedCategory)}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="hover:text-navy dark:hover:text-white"
                aria-label="Remove category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="w-full pl-10 pr-8 py-2 rounded-full border border-border/80 dark:border-white/15 bg-surface dark:bg-zinc-900 text-sm font-medium text-navy dark:text-white shadow-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Short List Dropdown Filter matching sketch balloon */}
          <div className="relative" ref={shortListRef}>
            <button
              type="button"
              onClick={() => setIsShortListOpen((prev) => !prev)}
              aria-expanded={isShortListOpen}
              aria-haspopup="true"
              aria-label="Short list filter"
              className={`inline-flex items-center justify-between gap-2 px-4 py-2 rounded-full border text-sm font-bold shadow-xs transition-all ${
                selectedCategory !== 'ALL' || isShortListOpen
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface dark:bg-zinc-900 border-border/80 dark:border-white/15 text-navy dark:text-white hover:border-accent'
              }`}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Short List</span>
            </button>

            {isShortListOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-white dark:bg-zinc-900 border border-border/90 dark:border-white/15 shadow-xl py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-border/50 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  Categories
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectCategory('ALL')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-left transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-accent/10 text-accent font-extrabold'
                      : 'text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>All Categories</span>
                  {selectedCategory === 'ALL' && <Check className="h-3.5 w-3.5 text-accent" />}
                </button>
                {ACT_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleSelectCategory(cat.value)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-left transition-colors ${
                        isSelected
                          ? 'bg-accent/10 text-accent font-bold'
                          : 'text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200 text-center animate-in fade-in duration-200">
            {toastMessage}
          </div>
        )}

        {/* 2-Column Cards Layout matching sketch: 1, 2, 3 on left; 4, 5, 6 on right */}
        {paginatedActs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2">
            {/* Left Column (Items 1, 2, 3) */}
            <div className="space-y-3 sm:space-y-4">
              {leftColumnActs.map(({ act, index }) => (
                <ActCardRow
                  key={act.id}
                  act={act}
                  index={index}
                  categoryLabel={categoryLabelMap.get(act.category) || act.category}
                  onView={() => handleView(act)}
                  onDownload={() => handleDownload(act)}
                />
              ))}
            </div>

            {/* Right Column (Items 4, 5, 6) */}
            <div className="space-y-3 sm:space-y-4">
              {rightColumnActs.map(({ act, index }) => (
                <ActCardRow
                  key={act.id}
                  act={act}
                  index={index}
                  categoryLabel={categoryLabelMap.get(act.category) || act.category}
                  onView={() => handleView(act)}
                  onDownload={() => handleDownload(act)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface dark:bg-zinc-900 rounded-2xl border border-border/80 dark:border-white/10 p-12 text-center max-w-md mx-auto my-8">
            <BookOpen className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
            <h2 className="text-base font-bold text-navy dark:text-white">No acts or laws found</h2>
            <p className="mt-1 text-xs text-text-secondary">
              No legal documents match your search &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Sketch-style Pagination: (1) (2) (3) [Next] */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {/* Previous button if past page 1 */}
            {validCurrentPage > 1 && (
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border/80 dark:border-white/15 bg-surface dark:bg-zinc-900 text-xs font-bold text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {/* Circled Number Buttons matching (1) (2) (3) */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                className={`inline-flex items-center justify-center h-9 w-9 rounded-full text-xs font-extrabold transition-all ${
                  validCurrentPage === pageNumber
                    ? 'bg-navy dark:bg-accent text-white shadow-sm ring-2 ring-navy/20 dark:ring-accent/30'
                    : 'border border-border/80 dark:border-white/15 bg-surface dark:bg-zinc-900 text-navy dark:text-white hover:border-accent hover:text-accent shadow-xs'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            {/* Next Button matching (Next) in sketch */}
            {validCurrentPage < totalPages && (
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="inline-flex items-center gap-1 px-3.5 h-9 rounded-full border border-border/80 dark:border-white/15 bg-surface dark:bg-zinc-900 text-xs font-bold text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-accent hover:text-accent transition-colors shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* PDF View Reader / Detail Modal */}
      {viewingAct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="act-reader-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-surface dark:bg-zinc-900 rounded-3xl shadow-2xl border border-border dark:border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-border/60 dark:border-white/10 bg-slate-50 dark:bg-zinc-950">
              <div className="min-w-0 pr-3">
                <h3 id="act-reader-title" className="text-sm sm:text-base font-extrabold text-navy dark:text-white truncate">
                  {viewingAct.title}
                </h3>
                <span className="text-[11px] font-semibold text-text-muted">
                  {categoryLabelMap.get(viewingAct.category) || viewingAct.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {viewingAct.documentUrl && (
                  <>
                    <a
                      href={viewingAct.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 dark:border-white/15 bg-white dark:bg-zinc-900 text-xs font-bold text-navy dark:text-white hover:border-accent transition-colors"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Open in Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDownload(viewingAct)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-xs font-bold text-white hover:bg-accent-hover transition-colors shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Download</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setViewingAct(null)}
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close reader"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* PDF Viewer or Detail Container */}
            <div className="flex-1 w-full bg-zinc-900 relative overflow-hidden">
              {viewingAct.documentUrl ? (
                <iframe
                  src={`${viewingAct.documentUrl}#toolbar=1&navpanes=0`}
                  title={viewingAct.title}
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-surface dark:bg-zinc-900">
                  <FileText className="h-12 w-12 text-text-muted/40 mb-3" aria-hidden="true" />
                  <h4 className="text-base font-bold text-navy dark:text-white">Document Preview Preparing</h4>
                  <p className="mt-1 text-xs text-text-secondary max-w-md">
                    The official PDF document for &ldquo;{viewingAct.title}&rdquo; is being processed by the editorial team.
                  </p>
                  {viewingAct.description && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-border/60 max-w-lg text-left text-xs text-text-secondary leading-relaxed">
                      {viewingAct.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Single horizontal card row matching the handwritten sketch layout:
// [ 1. Constitution of Nepal (नेपालको संविधान)                 View   Download ]
function ActCardRow({
  act,
  index,
  categoryLabel,
  onView,
  onDownload,
}: {
  act: ActItem;
  index: number;
  categoryLabel: string;
  onView: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 dark:border-white/10 bg-surface dark:bg-zinc-900/90 px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs hover:border-accent/50 hover:shadow-sm transition-all duration-150">
      {/* Left side: Number prefix + Title */}
      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1 pr-2">
        <span className="shrink-0 text-sm sm:text-base font-extrabold text-navy/70 dark:text-zinc-400 group-hover:text-accent transition-colors font-mono">
          {index}.
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-[15px] font-bold text-navy dark:text-white leading-snug truncate group-hover:text-accent transition-colors">
              {act.title}
            </h2>
            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-text-muted border border-border/40">
              {categoryLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: View & Download buttons matching sketch */}
      <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 dark:border-white/10 bg-surface dark:bg-zinc-800 text-xs font-bold text-navy dark:text-white hover:border-accent hover:text-accent transition-colors active:scale-95 shadow-2xs"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>View</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-xs font-bold text-white hover:bg-accent-hover transition-colors active:scale-95 shadow-2xs"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
