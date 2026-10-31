'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSemesterAction, updateSemesterAction } from '@/modules/admin/admin-semester.actions';
import { ArrowLeft, Save } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

interface SemesterFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string | null;
    order: number;
  };
}

export default function SemesterForm({ initialData }: SemesterFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [order, setOrder] = useState<number>(initialData?.order ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to suggest slug from name if empty
  const handleGenerateSlug = () => {
    if (!name) return;
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Semester name is required.');
      return;
    }

    if (slug.trim() && !/^[a-z0-9-]+$/.test(slug.trim())) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens (e.g. 1st-semester).');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialData) {
        const res = await updateSemesterAction({
          id: initialData.id,
          name: name.trim(),
          slug: slug.trim() || undefined,
          order: Number(order) || 0,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to update semester');
        }
      } else {
        const res = await createSemesterAction({
          name: name.trim(),
          slug: slug.trim() || undefined,
          order: Number(order) || 0,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to create semester');
        }
      }

      router.push('/admin/study/semesters');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/study/semesters"
          className="inline-flex items-center text-sm font-bold text-text-secondary hover:text-accent mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
          Back to Semesters
        </Link>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          {isEditing ? 'Edit Semester' : 'Create New Semester'}
        </h1>
        <p className="mt-1 text-text-secondary font-medium">
          {isEditing
            ? `Update details for "${initialData?.name}"`
            : 'Add a new academic semester to the curriculum.'}
        </p>
      </div>

      <AnimatePresence initial={false}>
      {error && (
        <Appear key="error">
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-900/50 font-medium text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-600 ml-3 text-sm font-bold"
          >
            ✕
          </button>
        </div>
        </Appear>
      )}
      </AnimatePresence>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 rounded-2xl p-5 sm:p-8 lg:p-10 space-y-6"
      >
        {/* Semester Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Semester Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 1st Semester, 2nd Semester"
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-medium sm:text-base"
          />
          <p className="text-xs text-text-muted mt-1.5">
            The public display name for this academic semester.
          </p>
        </div>

        {/* Slug */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="slug" className="block text-sm font-bold text-navy dark:text-white">
              SEO URL Slug
            </label>
            {!slug && name && (
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Auto-generate from name
              </button>
            )}
          </div>
          <input
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="e.g. 1st-semester"
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono sm:text-sm"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Strictly lowercase letters, numbers, and hyphens only (e.g., <code>1st-semester</code>). Leave blank if not required.
          </p>
        </div>

        {/* Display Order */}
        <div>
          <label htmlFor="order" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Display Order
          </label>
          <input
            type="number"
            id="order"
            required
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
            className="block w-full sm:w-40 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-medium sm:text-base"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Determines sorting order on the public site and admin lists (ascending, 1 comes before 2).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
          <Link
            href="/admin/study/semesters"
            className="px-6 py-2.5 border border-black/10 dark:border-white/10 rounded-xl font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm"
          >
            Cancel
          </Link>
          <MotionButton
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-[background-color,border-color,color,box-shadow,opacity] duration-300 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Update Semester' : 'Create Semester'}</span>
          </MotionButton>
        </div>
      </form>
    </div>
  );
}
