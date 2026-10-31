'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  createRedirectAction,
  deleteRedirectAction,
  toggleRedirectAction,
  updateRedirectAction,
} from '@/modules/admin/admin-site-settings.actions';
import { MotionButton } from '@/components/motion/primitives';

export interface RedirectRow {
  id: string;
  source: string;
  destination: string;
  statusCode: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const inputClass =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-navy dark:text-white shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

const emptyForm = {
  source: '',
  destination: '',
  statusCode: 301,
  isActive: true,
  notes: '',
};

export default function RedirectsClient({ initialRedirects }: { initialRedirects: RedirectRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function startEdit(row: RedirectRow) {
    setEditingId(row.id);
    setError('');
    setSaved(false);
    setForm({
      source: row.source,
      destination: row.destination,
      statusCode: row.statusCode,
      isActive: row.isActive,
      notes: row.notes ?? '',
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    const payload = {
      source: form.source,
      destination: form.destination,
      statusCode: form.statusCode,
      isActive: form.isActive,
      notes: form.notes,
    };

    const result = editingId
      ? await updateRedirectAction({ id: editingId, ...payload })
      : await createRedirectAction(payload);

    if (result?.success) {
      setSaved(true);
      resetForm();
      router.refresh();
    } else {
      setError((result as { error?: string })?.error || 'Could not save the redirect.');
    }

    setLoading(false);
  }

  async function handleToggle(row: RedirectRow) {
    setRowLoading(row.id);
    const result = await toggleRedirectAction({ id: row.id });
    if (!result?.success) {
      alert((result as { error?: string })?.error || 'Could not update the redirect.');
    } else {
      router.refresh();
    }
    setRowLoading(null);
  }

  async function handleDelete(row: RedirectRow) {
    if (!confirm(`Delete the redirect from ${row.source}?`)) return;
    setRowLoading(row.id);
    const result = await deleteRedirectAction({ id: row.id });
    if (!result?.success) {
      alert((result as { error?: string })?.error || 'Could not delete the redirect.');
    } else {
      if (editingId === row.id) resetForm();
      router.refresh();
    }
    setRowLoading(null);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-navy dark:text-white">
              {editingId ? 'Edit redirect' : 'Add a redirect'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Source paths are normalised to start with a slash and drop any trailing slash.
            </p>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-text-secondary transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
              Cancel edit
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Redirect saved.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-navy dark:text-white">From path</span>
              <input
                required
                maxLength={500}
                placeholder="/old-page"
                value={form.source}
                onChange={(e) => update('source', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-navy dark:text-white">To path or URL</span>
              <input
                required
                maxLength={1000}
                placeholder="/news or https://example.com/page"
                value={form.destination}
                onChange={(e) => update('destination', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-navy dark:text-white">Type</span>
              <select
                value={form.statusCode}
                onChange={(e) => update('statusCode', Number(e.target.value))}
                className={inputClass}
              >
                <option value={301}>301 — Permanent</option>
                <option value={302}>302 — Temporary</option>
                <option value={307}>307 — Temporary (keep method)</option>
                <option value={308}>308 — Permanent (keep method)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-navy dark:text-white">Status</span>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => update('isActive', e.target.value === 'active')}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-navy dark:text-white">Notes (optional)</span>
            <input
              maxLength={500}
              placeholder="Why this redirect exists"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex justify-end">
            <MotionButton
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? 'Saving…' : editingId ? 'Save changes' : 'Add redirect'}
            </MotionButton>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-slate-50/80 backdrop-blur-md dark:bg-zinc-900/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">From</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">To</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 bg-white dark:divide-white/5 dark:bg-zinc-900">
              {initialRedirects.length > 0 ? (
                initialRedirects.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 text-sm font-bold text-navy dark:text-white">
                      <span className="break-all">{row.source}</span>
                      {row.notes ? (
                        <span className="mt-1 block text-xs font-medium text-text-muted" title={row.notes}>
                          {row.notes}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-secondary">
                      <span className="break-all">{row.destination}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-navy dark:text-white">
                      {row.statusCode}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => handleToggle(row)}
                        disabled={rowLoading === row.id}
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
                          row.isActive
                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                        title={row.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {rowLoading === row.id ? '…' : row.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-black/5 px-3 py-2 text-navy shadow-sm transition hover:bg-slate-100 dark:border-white/5 dark:text-white dark:hover:bg-zinc-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={rowLoading === row.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="text-sm font-medium text-text-secondary">
                      No redirects yet. Add one above to catch old links.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
