'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Loader2, FileQuestion, Languages, Sparkles, GraduationCap } from 'lucide-react';
import { hitIcon, hitChip, type SearchHit } from '@/components/search/search-results';
import { useLiveSearch } from '@/hooks/use-live-search';

/**
 * Global navbar search: an icon button on every page that opens a large
 * overlay with LIVE results — they update as you type, no Enter needed.
 * Matching is transliteration-aware on the server (roman lipi "ram" surfaces
 * Devanagari "राम" and vice versa) across study materials, blogs, news,
 * historical facts, publications and events.
 * The overlay is portaled to <body> so it is never clipped or de-stacked by
 * the sticky header's own stacking context.
 */
export default function NavbarSearch({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on route change
  useEffect(() => () => setOpen(false), []);

  // Live search as you type (debounced + aborted per keystroke).
  const { result, loading } = useLiveSearch(query, open);

  const flatItems: SearchHit[] = result?.groups.flatMap((g) => g.items) ?? [];

  const go = (url: string) => {
    setOpen(false);
    // WP-only posts link to their canonical permalink (absolute URL).
    if (/^https?:\/\//i.test(url)) window.location.assign(url);
    else router.push(url);
  };

  const runSearch = () => {
    const q = query.trim();
    if (!q) return;
    // With results, Enter opens the highlighted hit; otherwise land on the
    // full results page (never the study page — that was misleading).
    if (flatItems.length > 0) go(flatItems[Math.min(highlighted, flatItems.length - 1)].url);
    else go(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  };

  const showPanel = open;
  const hasResults = result && result.total > 0 && !loading;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        title="Search"
        className={`${
          variant === 'mobile' ? 'w-10 h-10' : 'w-9 h-9'
        } shrink-0 flex items-center justify-center rounded-full text-text-secondary hover:text-accent hover:bg-surface-alt transition-colors`}
      >
        <Search className={variant === 'mobile' ? 'w-5 h-5' : 'w-[18px] h-[18px]'} strokeWidth={2.4} />
      </button>

      {showPanel &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-start justify-center bg-navy/50 dark:bg-black/70 backdrop-blur-sm px-4 pt-20 sm:pt-32 animate-in fade-in duration-150"
            onClick={() => setOpen(false)}
            role="presentation"
          >
          <div
            className="w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input bar */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
              <Search className="w-5 h-5 text-accent shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search... (e.g. adalati dastur · अदालती दस्तुर)"
                className="flex-1 bg-transparent outline-none text-text-primary text-base sm:text-lg placeholder:text-text-muted/70 min-w-0"
                aria-label="Search the site"
                autoComplete="off"
                role="combobox"
                aria-expanded="true"
                aria-controls="navbar-search-results"
              />
              {loading ? (
                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close search"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div id="navbar-search-results" className="max-h-[55vh] overflow-y-auto">
              {/* Translit hint while typing */}
              {query.trim().length >= 2 && (
                <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-[11px] text-text-muted border-b border-border/60 bg-surface-alt/50 dark:bg-white/[0.03]">
                  <Languages className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    Roman &amp; Devanagari both match — <span className="font-semibold text-text-secondary">ram</span> finds <span className="font-semibold text-text-secondary">राम</span>.
                  </span>
                </div>
              )}

              {loading && (
                <div className="px-4 sm:px-5 py-4 space-y-2.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-surface-alt" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-surface-alt rounded w-3/4" />
                        <div className="h-2.5 bg-surface-alt rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && query.trim().length < 2 && (
                <div className="px-4 sm:px-5 py-8 text-center">
                  <Sparkles className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-bold text-text-primary">Search the site</p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Law notes, case laws, old questions, blogs, news, historical facts, publications &amp; events.
                  </p>
                </div>
              )}

              {!loading && result && result.total === 0 && query.trim().length >= 2 && (
                <div className="px-4 sm:px-5 py-8 text-center">
                  <FileQuestion className="w-6 h-6 text-text-muted mx-auto mb-2" />
                  <p className="text-sm font-bold text-text-primary">No matches for “{result.query}”</p>
                  <p className="text-xs text-text-muted mt-1">
                    Try another spelling (roman or Devanagari), or browse study materials directly.
                  </p>
                </div>
              )}

              {!loading && hasResults && (
                <div className="py-2">
                  {result!.groups.map((group) => (
                    <div key={group.label} className="px-4 sm:px-5">
                      <div className="flex items-center gap-2 pt-2.5 pb-1">
                        <GraduationCap className="w-3 h-3 text-text-muted" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((hit) => {
                        const Icon = hitIcon(hit.category);
                        const idx = flatItems.indexOf(hit);
                        return (
                          <button
                            key={hit.id}
                            type="button"
                            onMouseEnter={() => setHighlighted(idx)}
                            onClick={() => go(hit.url)}
                            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors ${
                              idx === highlighted ? 'bg-accent/10' : 'hover:bg-surface-alt dark:hover:bg-white/5'
                            }`}
                          >
                            <span className={`p-2 rounded-lg shrink-0 ${hitChip(hit.category)}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-text-primary truncate">
                                {hit.title}
                              </span>
                              {hit.snippet ? (
                                <span className="block text-[11px] text-text-muted truncate">{hit.snippet}</span>
                              ) : hit.meta ? (
                                <span className="block text-[11px] text-text-muted truncate">{hit.meta}</span>
                              ) : null}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer — always-available fallback */}
            <div className="px-4 sm:px-5 py-3 bg-surface-alt/60 dark:bg-white/[0.03] border-t border-border flex items-center justify-between gap-3">
              <p className="text-[11px] text-text-muted min-w-0 truncate">
                {hasResults
                  ? `${result!.total} result${result!.total === 1 ? '' : 's'} — ↑↓ to move, Enter to open`
                  : 'Results appear here as you type'}
              </p>
              <button
                type="button"
                onClick={() => { const q = query.trim(); if (q) go(`/search?q=${encodeURIComponent(q)}`); }}
                disabled={!query.trim()}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-navy dark:bg-accent text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-40 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                View All Results
              </button>
            </div>
          </div>
        </div>,
          document.body
      )}
    </>
  );
}
