'use client';

import { setResourcePublishedAction } from '@/modules/admin/admin-resource.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Publish a draft, or move a published resource back to draft. Drafts are
 * hidden from students on every public page.
 */
export default function PublishResourceButton({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (published && !confirm('Move this resource to draft? Students will no longer see it until you publish it again.')) return;

    setLoading(true);
    try {
      const res = await setResourcePublishedAction({ id, published: !published });
      if (!res.success) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm ${
        published
          ? 'border border-black/5 dark:border-white/5 text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      }`}
    >
      {loading ? 'Saving...' : published ? 'Move to Draft' : 'Publish'}
    </button>
  );
}
