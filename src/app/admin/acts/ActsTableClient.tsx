'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { deleteActAction, bulkDeleteActsAction } from '@/modules/admin/admin-act.actions';
import { ACT_CATEGORIES } from '@/modules/acts/act.constants';

export interface ActRow {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  category: string;
  documentUrl: string | null;
  status: string;
}

export default function ActsTableClient({ acts }: { acts: ActRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryMap = new Map<string, string>(ACT_CATEGORIES.map((c) => [c.value, c.label]));

  const allSelected = acts.length > 0 && selected.size === acts.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(acts.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selected.size} selected act${selected.size > 1 ? 's' : ''}?`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await bulkDeleteActsAction({ ids: Array.from(selected) });
      if (res?.success) {
        setSelected(new Set());
        router.refresh();
      } else {
        alert(res?.error || 'Failed to delete selected acts');
      }
    } catch {
      alert('Network or server error while deleting selected acts');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title || 'this act'}"?`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await deleteActAction({ id });
      if (res?.success) {
        router.refresh();
      } else {
        alert(res?.error || 'Failed to delete act');
      }
    } catch {
      alert('Network or server error while deleting act');
    } finally {
      setDeletingId(null);
    }
  };

  if (acts.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-8 py-16 text-center">
          <FileText className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
          <p className="text-base font-bold text-navy dark:text-white">No acts or laws found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
      {/* Bulk action bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-black/5 dark:border-white/5 bg-slate-50/80 dark:bg-zinc-900/80">
        <p className="text-xs font-bold text-text-secondary">
          {selected.size > 0
            ? `${selected.size} of ${acts.length} selected`
            : `${acts.length} act${acts.length > 1 ? 's' : ''}`}
        </p>
        <button
          type="button"
          onClick={handleBulkDelete}
          disabled={deleting || selected.size === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Delete Selected
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <tr>
              <th className="px-4 py-4 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all acts"
                  className="h-4 w-4 rounded border-black/20 dark:border-white/20 accent-accent cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                Title & Details
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                PDF File
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {acts.map((act) => (
              <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(act.id)}
                    onChange={() => toggleOne(act.id)}
                    aria-label={`Select ${act.title}`}
                    className="h-4 w-4 rounded border-black/20 dark:border-white/20 accent-accent cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="min-w-[240px]">
                    <p className="text-sm font-bold text-navy dark:text-white leading-snug">
                      {act.title}
                    </p>
                    {act.titleEn && act.titleEn !== act.title && (
                      <p className="text-xs text-text-muted mt-0.5">{act.titleEn}</p>
                    )}
                    <p className="text-[11px] font-mono text-text-muted mt-1 opacity-75">
                      slug: /{act.slug}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-slate-100 dark:bg-zinc-800 text-text-secondary border border-black/5 dark:border-white/5">
                    {categoryMap.get(act.category) || act.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs">
                  {act.documentUrl ? (
                    <a
                      href={act.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>PDF Available</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-text-muted italic">No PDF attached</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs">
                  <span
                    className={`px-2.5 py-1 inline-flex font-bold rounded-full border ${
                      act.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                        : act.status === 'DRAFT'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                    }`}
                  >
                    {act.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/acts/${act.id}/edit`}
                      className="inline-flex items-center px-3 py-1.5 border border-black/5 dark:border-white/5 rounded-lg text-xs font-bold text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(act.id, act.title)}
                      disabled={deletingId === act.id}
                      aria-label="Delete act"
                      className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                    >
                      {deletingId === act.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
