'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  Eye,
  Download,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Scale,
  Sparkles,
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

const ITEMS_PER_PAGE = 10; // 5 per column on desktop for a balanced 2-column layout

export default function ActsAndLawsClient({ initialActs }: ActsAndLawsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingAct, setViewingAct] = useState<ActItem | null>(null);

  // Category mapping
  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    ACT_CATEGORIES.forEach((c) => map.set(c.value, c.label));
    return map;
  }, []);

  // Filter and sort items alphabetically A-Z
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

    // Always Alphabetical Order A-Z
    result.sort((a, b) => a.title.localeCompare(b.title, 'ne-NP', { sensitivity: 'base' }));

    return result;
  }, [initialActs, selectedCategory, searchQuery]);

  // Reset page when filter changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
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

  // Split into 2 columns matching the handwritten sketch layout (1, 2, 3 left; 4, 5, 6 right)
  const leftColumnActs: { act: ActItem; index: number }[] = [];
  const rightColumnActs: { act: ActItem; index: number }[] = [];

  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  paginatedActs.forEach((act, i) => {
    const itemIndex = startIndex + i + 1;
    // On 2 columns: first half to left column, second half to right column
    const half = Math.ceil(paginatedActs.length / 2);
    if (i < half) {
      leftColumnActs.push({ act, index: itemIndex });
    } else {
      rightColumnActs.push({ act, index: itemIndex });
    }
  });

  const handleDownload = (act: ActItem) => {
    if (!act.documentUrl) {
      alert(`The document for "${act.title}" is being prepared and will be uploaded shortly.`);
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
    if (!act.documentUrl) {
      alert(`The document for "${act.title}" is being prepared and will be uploaded shortly.`);
      return;
    }
    setViewingAct(act);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-zinc-950 text-navy dark:text-white pb-20">
      {/* Top Hero Banner */}
      <div className="relative border-b border-border/50 bg-white dark:bg-zinc-900/60 backdrop-blur-md pt-12 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent dark:text-accent-light text-xs font-bold mb-4">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nepal Legal Repository</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-navy dark:text-white">
            Acts and Laws
          </h1>

          <p className="mt-3 text-base sm:text-lg text-text-secondary dark:text-zinc-400 max-w-2xl mx-auto font-medium">
            Get all the important Acts, Laws & Regulations in Alphabetical order
          </p>

          {/* Controls Bar: Search & Short List */}
          <div className="mt-8 max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search Acts, Laws, Regulations..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-medium text-navy dark:text-white shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-lg"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Short List Dropdown Filter */}
            <div className="relative sm:w-60">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  aria-label="Short list filter"
                  className="w-full appearance-none rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 pl-4 pr-10 py-3.5 text-sm font-bold text-navy dark:text-white shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer"
                >
                  <option value="ALL">Short list: All</option>
                  {ACT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <Filter className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="mt-5 flex items-center justify-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleCategoryChange('ALL')}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
            {ACT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategoryChange(cat.value)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Results Counter & Order Signal */}
        <div className="flex items-center justify-between text-xs text-text-muted mb-6 px-1">
          <span className="font-semibold">
            Showing <strong className="text-navy dark:text-white">{filteredActs.length}</strong> Acts & Laws
            {selectedCategory !== 'ALL' && ` in ${categoryLabelMap.get(selectedCategory)}`}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-accent">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Alphabetical Order (A–Z)
          </span>
        </div>

        {/* 2-Column Grid Layout matching the sketch */}
        {paginatedActs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {/* Left Column (Items 1, 2, 3...) */}
            <div className="space-y-4">
              {leftColumnActs.map(({ act, index }) => (
                <ActCard
                  key={act.id}
                  act={act}
                  index={index}
                  categoryLabel={categoryLabelMap.get(act.category) || act.category}
                  onView={() => handleView(act)}
                  onDownload={() => handleDownload(act)}
                />
              ))}
            </div>

            {/* Right Column (Items 4, 5, 6...) */}
            <div className="space-y-4">
              {rightColumnActs.map(({ act, index }) => (
                <ActCard
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
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/10 p-12 text-center max-w-lg mx-auto">
            <BookOpen className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
            <h3 className="text-lg font-bold text-navy dark:text-white">No acts or laws found</h3>
            <p className="mt-1 text-xs text-text-secondary">
              No legal documents match your search &ldquo;{searchQuery}&rdquo;. Try another term or reset your category.
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

        {/* Pagination matching the sketch: (1) (2) (3) [Next] */}
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

      {/* PDF View Reader Modal */}
      {viewingAct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="act-reader-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-zinc-950">
              <div className="min-w-0 pr-4">
                <h3 id="act-reader-title" className="text-base font-extrabold text-navy dark:text-white truncate">
                  {viewingAct.title}
                </h3>
                {viewingAct.description && (
                  <p className="text-xs text-text-muted truncate mt-0.5">{viewingAct.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {viewingAct.documentUrl && (
                  <>
                    <a
                      href={viewingAct.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs font-bold text-navy dark:text-white hover:border-accent transition-colors"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Open in Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDownload(viewingAct)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-xs font-bold text-white hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Download</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setViewingAct(null)}
                  className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close reader"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="flex-1 w-full bg-zinc-800 relative">
              {viewingAct.documentUrl ? (
                <iframe
                  src={`${viewingAct.documentUrl}#toolbar=1&navpanes=0`}
                  title={viewingAct.title}
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/70 text-sm">
                  PDF document preview unavailable
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Act Card matching the sketch notation
function ActCard({
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
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200">
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Index number bubble */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 dark:bg-accent/15 text-accent dark:text-accent-light font-extrabold text-sm shadow-xs">
          {index}
        </div>

        {/* Title and metadata */}
        <div className="flex-1 min-w-0 pr-1">
          <h2 className="text-sm sm:text-base font-extrabold text-navy dark:text-white leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {act.title}
          </h2>

          {act.description && (
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {act.description}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-text-secondary dark:text-zinc-300 border border-black/5 dark:border-white/5">
              {categoryLabel}
            </span>
            {act.documentUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <FileText className="h-3 w-3" aria-hidden="true" />
                PDF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: [View] [Download] matching the sketch */}
      <div className="mt-4 pt-3.5 border-t border-border/40 dark:border-white/5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/80 text-xs font-bold text-navy dark:text-white hover:border-accent hover:text-accent dark:hover:border-accent transition-all active:scale-[0.98]"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>View</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-hover shadow-xs transition-all active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
