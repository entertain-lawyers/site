'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon, Images, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { AnimatePresence, Backdrop, DialogPanel } from '@/components/motion/primitives';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { listWordPressMediaAction, type WordPressMediaPage } from '@/modules/admin/admin-wp-media.actions';
import type { WordPressLanguage } from '@/lib/wordpress';
import type { WordPressMediaItem } from '@/lib/wordpress-media';

const LIBRARY_NAMES: Record<WordPressLanguage, string> = {
  en: 'English',
  ne: 'Nepali',
};

/**
 * Browse the WordPress Media Library of one language and pick an image. The
 * list comes from a server action, so no WordPress request (or credential)
 * ever runs in the browser.
 */
export default function WordPressMediaLibraryDialog({
  open,
  lang,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  lang: WordPressLanguage;
  selectedId: number | null;
  onClose: () => void;
  onSelect: (item: WordPressMediaItem) => void;
}) {
  useEscapeKey(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <Backdrop
          key="wp-media-library"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          {/* Keyed by language so search, page and selection start fresh for each library. */}
          <MediaLibraryPanel key={lang} lang={lang} selectedId={selectedId} onClose={onClose} onSelect={onSelect} />
        </Backdrop>
      )}
    </AnimatePresence>
  );
}

type Response = { key: string; data?: WordPressMediaPage; error?: string };

function MediaLibraryPanel({
  lang,
  selectedId,
  onClose,
  onSelect,
}: {
  lang: WordPressLanguage;
  selectedId: number | null;
  onClose: () => void;
  onSelect: (item: WordPressMediaItem) => void;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<Response | null>(null);
  const [lastData, setLastData] = useState<WordPressMediaPage | null>(null);
  const [highlighted, setHighlighted] = useState<WordPressMediaItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce typing into one search request.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === query) return;
    const t = window.setTimeout(() => {
      setQuery(next);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, query]);

  // The request in flight is identified by its key; a response for an older
  // key (a superseded search or page) is ignored, and loading is derived.
  const requestKey = `${lang}|${page}|${query}|${reloadKey}`;
  const latestKey = useRef(requestKey);
  useEffect(() => {
    latestKey.current = requestKey;
    listWordPressMediaAction({ lang, page, search: query || undefined })
      .then((res) => {
        if (latestKey.current !== requestKey) return;
        if (res.success) {
          setResponse({ key: requestKey, data: res.data });
          setLastData(res.data);
        } else {
          setResponse({ key: requestKey, error: res.error });
        }
      })
      .catch(() => {
        if (latestKey.current === requestKey) {
          setResponse({ key: requestKey, error: 'The Media Library could not be loaded. Try again.' });
        }
      });
  }, [lang, page, query, requestKey]);

  const loading = response?.key !== requestKey;
  const error = !loading ? response?.error ?? '' : '';
  const result = !loading && response?.data ? response.data : lastData;

  const confirm = useCallback(() => {
    if (highlighted) onSelect(highlighted);
  }, [highlighted, onSelect]);

  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 1;

  return (
          <DialogPanel
            role="dialog"
            aria-modal="true"
            aria-labelledby="wp-media-library-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-black/5 bg-slate-50 p-4 dark:border-white/5 dark:bg-zinc-800/50 sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Images className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 id="wp-media-library-title" className="text-lg font-bold text-navy dark:text-white">
                    Media Library
                  </h3>
                  <p className="truncate text-xs text-text-secondary">
                    {LIBRARY_NAMES[lang]} WordPress
                    {result ? ` · ${result.total} image${result.total === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close media library"
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-black/5 hover:text-navy dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-black/5 p-4 dark:border-white/5 sm:px-6">
              <label className="relative block">
                <span className="sr-only">Search images</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <input
                  autoFocus
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by title or filename…"
                  className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm text-navy outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                />
              </label>
            </div>

            {/* Grid */}
            <div className="relative min-h-[16rem] flex-1 overflow-y-auto p-4 sm:p-6" aria-busy={loading}>
              {error ? (
                <div role="alert" className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <p className="max-w-md text-sm text-red-700 dark:text-red-300">{error}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                  </button>
                </div>
              ) : !loading && items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-text-secondary">
                  <ImageIcon className="h-10 w-10 opacity-30" aria-hidden="true" />
                  <p className="text-sm font-semibold">{query ? `No images match “${query}”.` : 'The Media Library has no images yet.'}</p>
                  {query && <p className="text-xs">Try a different word or clear the search.</p>}
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {loading && items.length === 0
                    ? Array.from({ length: 10 }, (_, i) => (
                        <li key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />
                      ))
                    : items.map((item) => {
                        const isHighlighted = highlighted?.id === item.id;
                        const isCurrent = selectedId === item.id;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => setHighlighted(item)}
                              onDoubleClick={() => onSelect(item)}
                              aria-pressed={isHighlighted}
                              title={item.filename}
                              className={`group block w-full overflow-hidden rounded-xl border bg-slate-50 text-left transition dark:bg-zinc-950 ${
                                isHighlighted
                                  ? 'border-accent ring-2 ring-accent'
                                  : 'border-black/10 hover:border-accent/50 dark:border-white/10'
                              }`}
                            >
                              <span className="relative block aspect-square overflow-hidden bg-slate-100 dark:bg-zinc-800">
                                {/* WordPress serves the thumbnails; next/image is not configured for it. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                                {isCurrent && (
                                  <span className="absolute left-2 top-2 rounded-md bg-navy/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Current
                                  </span>
                                )}
                              </span>
                              <span className="block truncate px-2 py-1.5 text-xs font-medium text-navy dark:text-white">{item.filename}</span>
                            </button>
                          </li>
                        );
                      })}
                </ul>
              )}
              {loading && items.length > 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-white/40 pt-16 dark:bg-zinc-900/40">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-black/5 bg-slate-50 p-4 dark:border-white/5 dark:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center justify-center gap-2 text-sm text-text-secondary sm:justify-start">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  aria-label="Previous page"
                  className="rounded-lg border border-black/10 p-1.5 text-navy transition hover:bg-white disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-zinc-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[6.5rem] text-center tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  aria-label="Next page"
                  className="rounded-lg border border-black/10 p-1.5 text-navy transition hover:bg-white disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-zinc-900"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p className="mr-auto truncate text-xs text-text-secondary sm:mr-2 sm:max-w-[14rem]">
                  {highlighted ? highlighted.filename : 'Select an image'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={!highlighted}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use image
                </button>
              </div>
            </div>
          </DialogPanel>
  );
}
