'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUnitAction, updateUnitAction } from '@/modules/admin/admin-unit.actions';
import { ArrowLeft, Save } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

interface SubjectOption {
  id: string;
  name: string;
  semester?: {
    name: string;
  } | null;
}

interface UnitFormProps {
  subjects: SubjectOption[];
  initialData?: {
    id: string;
    name: string;
    title: string | null;
    order: number;
    subjectId: string;
  };
}

export default function UnitForm({ subjects, initialData }: UnitFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId || subjects[0]?.id || '');
  const [order, setOrder] = useState<number>(initialData?.order ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Unit name is required (e.g. Unit 1 or Prescribed Cases).');
      return;
    }

    if (!subjectId) {
      setError('Please select a subject for this unit.');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialData) {
        const res = await updateUnitAction({
          id: initialData.id,
          name: name.trim(),
          title: title.trim() || undefined,
          subjectId,
          order: Number(order) || 0,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to update unit');
        }
      } else {
        const res = await createUnitAction({
          name: name.trim(),
          title: title.trim() || undefined,
          subjectId,
          order: Number(order) || 0,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to create unit');
        }
      }

      router.push('/admin/study/units');
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
          href="/admin/study/units"
          className="inline-flex items-center text-sm font-bold text-text-secondary hover:text-accent mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
          Back to Units
        </Link>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          {isEditing ? 'Edit Unit' : 'Create New Unit'}
        </h1>
        <p className="mt-1 text-text-secondary font-medium">
          {isEditing
            ? `Update details for "${initialData?.name}"`
            : 'Add a syllabus unit, module, or case group to a subject.'}
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
        {/* Unit Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Unit Name / Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unit 1, Unit I, or Prescribed Cases"
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-medium sm:text-base"
          />
          <p className="text-xs text-text-muted mt-1.5">
            The standard unit label used in syllabus listings.
          </p>
        </div>

        {/* Descriptive Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Descriptive Topic Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. General Introduction, Inchoate Crimes, etc."
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors sm:text-base"
          />
          <p className="text-xs text-text-muted mt-1.5">
            An optional subtitle or topic heading displayed next to the unit name.
          </p>
        </div>

        {/* Subject Selection */}
        <div>
          <label htmlFor="subjectId" className="block text-sm font-bold text-navy dark:text-white mb-2">
            Assigned Subject <span className="text-red-500">*</span>
          </label>
          <select
            id="subjectId"
            required
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-medium sm:text-base"
          >
            <option value="" disabled>Select a subject</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} {sub.semester?.name ? `(${sub.semester.name})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1.5">
            Choose the subject this unit belongs to.
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
            Sorting sequence within the subject (ascending, e.g. 1, 2, 3).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
          <Link
            href="/admin/study/units"
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
            <span>{loading ? 'Saving...' : isEditing ? 'Update Unit' : 'Create Unit'}</span>
          </MotionButton>
        </div>
      </form>
    </div>
  );
}
