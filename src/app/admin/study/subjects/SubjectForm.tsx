'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSubjectAction, updateSubjectAction } from '@/modules/admin/admin-subject.actions';
import { ArrowLeft, Save } from 'lucide-react';

interface SemesterOption {
  id: string;
  name: string;
  order: number;
}

interface SubjectFormProps {
  semesters: SemesterOption[];
  initialData?: {
    id: string;
    name: string;
    slug: string | null;
    order: number;
    semesterId: string;
  };
}

export default function SubjectForm({ semesters, initialData }: SubjectFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [semesterId, setSemesterId] = useState(initialData?.semesterId || semesters[0]?.id || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [order, setOrder] = useState<number>(initialData?.order ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError('Subject name is required.');
      return;
    }

    if (!semesterId) {
      setError('Please select a semester for this subject.');
      return;
    }

    if (slug.trim() && !/^[a-z0-9-]+$/.test(slug.trim())) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens (e.g. criminal-law-1).');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialData) {
        const res = await updateSubjectAction({
          id: initialData.id,
          name: name.trim(),
          semesterId,
          slug: slug.trim() || undefined,
          order: Number(order) || 0,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to update subject');
        }
      } else {
        const res = await createSubjectAction({
          name: name.trim(),
          semesterId,
          slug: slug.trim() || undefined,
          order: Number(order) || 0,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to create subject');
        }
      }

      router.push('/admin/study/subjects');
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
          href="/admin/study/subjects"
          className="inline-flex items-center text-sm font-bold text-text-secondary hover:text-accent mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
          Back to Subjects
        </Link>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          {isEditing ? 'Edit Subject' : 'Create New Subject'}
        </h1>
        <p className="mt-1 text-text-secondary font-medium">
          {isEditing
            ? `Update details for "${initialData?.name}"`
            : 'Add a new subject to an academic semester.'}
        </p>
      </div>

      {error && (
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
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 rounded-2xl p-5 sm:p-8 lg:p-10 space-y-6"
      >
        {/* Subject Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Subject Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Criminal Law-I, Constitutional Law"
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-medium sm:text-base"
          />
          <p className="text-xs text-text-muted mt-1.5">
            The curriculum name of this subject.
          </p>
        </div>

        {/* Semester Selection */}
        <div>
          <label htmlFor="semesterId" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Assigned Semester <span className="text-red-500">*</span>
          </label>
          <select
            id="semesterId"
            required
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-medium sm:text-base"
          >
            <option value="" disabled>Select a semester</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.name} (Order: {sem.order})
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1.5">
            Choose which semester this subject belongs to.
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
            placeholder="e.g. criminal-law-1"
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono sm:text-sm"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Strictly lowercase letters, numbers, and hyphens only (e.g., <code>criminal-law-1</code>). Leave blank if not required.
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
            Sorting sequence within the semester (ascending, e.g. 1, 2, 3).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
          <Link
            href="/admin/study/subjects"
            className="px-6 py-2.5 border border-black/10 dark:border-white/10 rounded-xl font-medium text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Update Subject' : 'Create Subject'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
