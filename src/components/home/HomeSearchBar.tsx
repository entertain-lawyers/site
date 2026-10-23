'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Loader2, Search, SearchX, Sparkles } from 'lucide-react';
import { hitIcon, hitChip } from '@/components/search/search-results';
import { useLiveSearch } from '@/hooks/use-live-search';

/**
 * Homepage hero search: live, real-time results under the input after every
 * keystroke — no Enter press needed. Enter still jumps to the full results
 * page (or the highlighted hit), and so does the footer button.
 */
export default function HomeSearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { result, loading } = useLiveSearch(query, open);

  const flatItems = result?.groups.flatMap((g) => g.items) ?? [];

  // Close when clicking/tapping outside the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const go = (url: string) => {
    setQuery('');
    setOpen(false);
    // WP-only posts link to their canonical permalink (absolute URL).
    if (/^https?:\/\//i.test(url)) window.location.assign(url);
    else router.push(url);
  };

  const runSearch = () => {
    const q = query.trim();
    if (!q) return;
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

  const hasResults = result && result.total > 0 && !loading;

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="relative group w-full"
        role="search"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search what you're looking for quickly and easily..."
          aria-label="Search the site"
          aria-expanded={open && Boolean(query.trim())}
          role="combobox"
          aria-controls="hero-search-results"
          autoComplete="off"
          className="w-full pl-6 pr-14 py-3 rounded-full border-2 border-border bg-surface text-text-primary focus:outline-none focus:border-accent shadow-sm transition-all text-sm sm:text-base"
        />
        <button
          type="button"
          aria-label="Search"
          onClick={runSearch}
          className="absolute right-2 top-2 bottom-2 aspect-square bg-navy dark:bg-accent text-white rounded-full flex items-center justify-center hover:bg-navy-light dark:hover:bg-accent-hover transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {/* Live results dropdown — updates after every keystroke */}
      {open && query.trim().length > 0 && (
        <div
          id="hero-search-results"
          className="absolute top-full left-0 right-0 mt-2 z-30 bg-surface dark:bg-[#0a1526] rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="max-h-[380px] overflow-y-auto" role="listbox">
            {loading && (
              <div className="px-4 py-3 flex items-center gap-2.5" aria-hidden="true">
                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
                <div className="h-3.5 bg-surface-alt rounded w-1/2 animate-pulse" />
              </div>
            )}

            {!loading && query.trim().length === 1 && (
              <div className="px-4 py-5 text-center">
                <Sparkles className="w-5 h-5 text-accent mx-auto mb-1.5" />
                <p className="text-xs text-text-muted">Keep typing — results appear instantly.</p>
              </div>
            )}

            {!loading && result && result.total === 0 && (
              <div className="px-4 py-5 text-center">
                <SearchX className="w-5 h-5 text-text-muted mx-auto mb-1.5" />
                <p className="text-sm font-bold text-text-primary">No matches for “{result.query}”</p>
                <p className="text-xs text-text-muted mt-1">Try another spelling (roman or Devanagari).</p>
              </div>
            )}

            {hasResults &&
              result!.groups.map((group) => (
                <div key={group.label} className="px-3">
                  <div className="flex items-center gap-1.5 pt-2.5 pb-1">
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
                        role="option"
                        aria-selected={idx === highlighted}
                        onMouseEnter={() => setHighlighted(idx)}
                        onClick={() => go(hit.url)}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                          idx === highlighted ? 'bg-accent/10' : 'hover:bg-surface-alt dark:hover:bg-white/5'
                        }`}
                      >
                        <span className={`p-1.5 rounded-lg shrink-0 ${hitChip(hit.category)}`}>
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

          {/* Footer — always-available fallback */}
          <div className="px-4 py-2.5 bg-surface-alt/60 dark:bg-white/[0.03] border-t border-border flex items-center justify-between gap-3">
            <p className="text-[11px] text-text-muted min-w-0 truncate">
              {hasResults
                ? `${result!.total} result${result!.total === 1 ? '' : 's'} — ↑↓ to move, Enter to open`
                : loading
                  ? 'Searching…'
                  : 'Results appear here as you type'}
            </p>
            <button
              type="button"
              onClick={() => { const q = query.trim(); if (q) go(`/search?q=${encodeURIComponent(q)}`); }}
              disabled={!query.trim()}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-navy dark:bg-accent text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              View All Results
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
