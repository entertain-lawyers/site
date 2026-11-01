'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, Search } from 'lucide-react';
import type { AuthorOption } from '@/lib/content-authors';

function roleLabel(role: AuthorOption['role']): string {
  if (role === 'ADMIN') return 'Administrator';
  if (role === 'EDITOR') return 'Editor';
  return 'User';
}

/**
 * Searchable author picker with name + role labels. Options are resolved on the
 * server (local users with their WordPress mapping); this only renders them.
 */
export default function AuthorSelect({
  authors,
  value,
  onChange,
  loading = false,
  error = null,
  emptyMessage = 'No eligible authors found.',
  hint,
  id = 'author',
  placeholder,
}: {
  authors: AuthorOption[];
  value: string;
  onChange: (authorId: string) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  hint?: string;
  id?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = authors.find((author) => author.id === value) ?? null;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return authors;
    return authors.filter(
      (author) =>
        author.name.toLowerCase().includes(term) ||
        roleLabel(author.role).toLowerCase().includes(term)
    );
  }, [authors, query]);

  const pick = (authorId: string) => {
    onChange(authorId);
    setOpen(false);
    setQuery('');
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        disabled={loading}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-navy dark:text-white">
            {selected ? selected.name : placeholder || 'Select an author'}
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            {selected ? roleLabel(selected.role) : placeholder ? 'Unmapped author' : 'No author selected'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
      </button>

      {hint && <p className="mt-2 text-xs text-text-secondary">{hint}</p>}

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
            <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search authors"
              aria-label="Search authors"
              className="w-full bg-transparent py-1 text-sm text-navy outline-none placeholder:text-text-muted dark:text-white"
            />
          </div>

          <ul role="listbox" aria-labelledby={id} className="max-h-64 overflow-y-auto py-1">
            {loading && (
              <li className="px-4 py-3 text-sm text-text-muted">Loading authors…</li>
            )}
            {error && (
              <li role="alert" className="flex items-start gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </li>
            )}
            {!loading && !error && filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-text-muted">
                {authors.length === 0 ? emptyMessage : 'No author matches that search.'}
              </li>
            )}
            {filtered.map((author) => (
              <li key={author.id} role="option" aria-selected={author.id === value}>
                <button
                  type="button"
                  onClick={() => pick(author.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800 ${
                    author.id === value ? 'bg-accent/5' : ''
                  }`}
                >
                  <span className="truncate text-sm font-semibold text-navy dark:text-white">{author.name}</span>
                  <span className="shrink-0 rounded-full border border-black/5 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-text-muted dark:border-white/10 dark:bg-zinc-800">
                    {roleLabel(author.role)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
