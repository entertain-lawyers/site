'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Scale,
  Sparkles,
  History,
  X,
  BookOpen,
  ArrowRight,
  Lock,
  LockOpen,
} from 'lucide-react';
import { searchMatches } from '@/lib/translit-search';
import { getCaseCategory, getCaseLawCategory } from '@/lib/case-category';
import CaseCategoryBadge from '@/components/study/CaseCategoryBadge';
import CaseLawCategoryBadge from '@/components/study/CaseLawCategoryBadge';
import AuthorBioTrigger from '@/components/author/AuthorBioTrigger';
import { Reveal } from '@/components/motion/primitives';

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

type FilterOption = 'ALL' | 'NEW_CASE' | 'OLD_CASE';

export default function PrescribedCasesView({
  cases,
  unitName,
  unitTitle,
  subjectName,
  semesterName,
  initialCategory,
}: PrescribedCasesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>(() => {
    if (initialCategory === 'NEW_CASE' || initialCategory === 'OLD_CASE') {
      return initialCategory;
    }
    return 'ALL';
  });

  // Counts for filter pills
  const newCasesCount = useMemo(
    () => cases.filter((c) => getCaseCategory(c) === 'NEW_CASE').length,
    [cases]
  );
  const oldCasesCount = useMemo(
    () => cases.filter((c) => getCaseCategory(c) === 'OLD_CASE').length,
    [cases]
  );
  const allCasesCount = cases.length;

  // Filter and search
  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // 1. Classification filter
      if (filter === 'NEW_CASE' && getCaseCategory(item) !== 'NEW_CASE') {
        return false;
      }
      if (filter === 'OLD_CASE' && getCaseCategory(item) !== 'OLD_CASE') {
        return false;
      }
      // 'ALL' includes all cases, including unclassified legacy cases

      // 2. Search query matching
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const matchesTitle = searchMatches(item.title, q);
        const matchesDesc = item.metaDesc ? searchMatches(item.metaDesc, q) : false;
        const matchesContent = item.content
          ? searchMatches(item.content.substring(0, 500), q)
          : false;
        const lawCat = getCaseLawCategory(item);
        const matchesLawCat = lawCat ? searchMatches(lawCat, q) : false;

        if (!matchesTitle && !matchesDesc && !matchesContent && !matchesLawCat) {
          return false;
        }
      }

      return true;
    });
  }, [cases, filter, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilter('ALL');
  };

  return (
    <div className="space-y-6" data-testid="prescribed-cases-view">
      {/* Unit Header Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                {unitName}
              </span>
              {subjectName && (
                <span className="text-xs font-semibold text-text-muted">
                  • {subjectName}
                </span>
              )}
              {semesterName && (
                <span className="text-xs font-semibold text-text-muted">
                  • {semesterName}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
              {unitTitle || 'Prescribed Landmark Cases'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary max-w-2xl">
              Essential judicial precedents, constitutional rulings, and syllabus case summaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted">
              Total: <strong className="text-navy dark:text-white">{allCasesCount}</strong> Cases
            </span>
          </div>
        </div>

        {/* Search Bar & Filter Controls (Acts & Laws Style) */}
        <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case name, number, or summary..."
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-border bg-surface-alt/40 text-sm font-medium text-navy dark:text-white shadow-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-alt/60 rounded-xl border border-border self-start sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'ALL'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-secondary hover:text-navy dark:hover:text-white'
              }`}
            >
              All Cases ({allCasesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('NEW_CASE')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'NEW_CASE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Cases ({newCasesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('OLD_CASE')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'OLD_CASE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-text-secondary hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Old Cases ({oldCasesCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span className="font-semibold">
          Showing <strong className="text-navy dark:text-white">{filteredCases.length}</strong> Prescribed Cases
          {filter !== 'ALL' && ` in ${filter === 'NEW_CASE' ? 'New Cases' : 'Old Cases'}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
      </div>

      {/* Cases Listing or Empty State */}
      {filteredCases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((item, i) => {
            const authorUser = item.author ?? item.createdBy;
            const resourceAuthor = {
              name: authorUser?.name || 'Entertain Lawyers',
              image: authorUser?.image || null,
              bio: authorUser?.bio || 'Precedent judgments and case law analysis.',
              role: authorUser?.role || 'Legal Contributor',
              website: authorUser?.website || null,
              email: authorUser?.email || null,
            };

            const caseLawCat = getCaseLawCategory(item);

            return (
              <Reveal key={item.id} index={i} perRow={3} lift className="h-full">
                <div className="group relative flex flex-col bg-surface border border-border rounded-2xl hover:border-accent hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] transition-[box-shadow,border-color,background-color] duration-300 p-6 h-full overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Badges Row */}
                  <div className="flex items-start justify-between mb-4 gap-2 flex-wrap relative z-10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CaseCategoryBadge category={item.metaTitle} size="sm" />
                      {caseLawCat && (
                        <CaseLawCategoryBadge category={caseLawCat} size="sm" />
                      )}
                    </div>
                    {item.isPremium ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gold/10 text-gold-dark border border-gold/20 uppercase tracking-wider">
                        <Lock className="w-3 h-3" />
                        Premium (Rs. {(item.priceAmount || 0) / 100})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border border-green-200 dark:border-green-800/40 uppercase tracking-wider">
                        <LockOpen className="w-3 h-3" />
                        Free
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-navy dark:text-white group-hover:text-accent transition-colors mb-3 line-clamp-2 leading-snug">
                    <Link href={`/resources/${item.id}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {item.title}
                    </Link>
                  </h3>

                  {/* Description / Summary Preview */}
                  {item.metaDesc && (
                    <p className="text-xs text-text-secondary line-clamp-3 mb-4 leading-relaxed">
                      {item.metaDesc}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-border flex justify-between items-center group-hover:border-accent/30 transition-colors">
                    <AuthorBioTrigger author={resourceAuthor} size="xs" showName />
                    <div className="flex items-center gap-1 text-xs font-bold text-accent">
                      <span>Read Case</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface rounded-3xl border border-border p-12 text-center max-w-lg mx-auto shadow-soft">
          <BookOpen className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
          <h3 className="text-lg font-bold text-navy dark:text-white">
            No prescribed cases found
          </h3>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            {searchQuery
              ? `No cases match your search "${searchQuery}". Try another keyword or reset the filter.`
              : 'There are no cases published in this category yet.'}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
