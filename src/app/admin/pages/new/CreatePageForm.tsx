'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBuilderPageAction } from '@/modules/admin/admin-page.actions';

export default function CreatePageForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugWasAuto, setSlugWasAuto] = useState(true);

  // Auto-slug once the user hasn't typed their own slug yet
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slugWasAuto) {
      const next = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(next);
      setSlugWasAuto(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await createBuilderPageAction({ title, slug, status: 'DRAFT' });
    if (res?.success) {
      router.push(`/admin/pages/${res.data.id}/edit`);
      router.refresh();
    } else {
      setError((res as { error?: string })?.error || 'Error creating page');
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 p-8 max-w-2xl space-y-5"
    >
      <div>
        <label htmlFor="bp-title" className="block text-sm font-bold text-navy dark:text-white mb-1.5">
          Page title
        </label>
        <input
          id="bp-title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
          maxLength={200}
          placeholder="e.g. New Semester Announcement"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div>
        <label htmlFor="bp-slug" className="block text-sm font-bold text-navy dark:text-white mb-1.5">
          URL slug <span className="text-text-muted font-medium">(public address: /p/…)</span>
        </label>
        <input
          id="bp-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugWasAuto(false);
          }}
          required
          pattern="[a-z0-9-]+"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <p className="mt-1 text-xs text-text-muted">Lowercase letters, numbers and dashes only.</p>
      </div>

      {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create & open builder'}
      </button>
    </form>
  );
}
