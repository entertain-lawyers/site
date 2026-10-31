'use client';

import { setResourceArchivedAction } from '@/modules/admin/admin-resource.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Archive hides a resource from students but keeps it (and its purchases and
 * entitlements). It is the alternative when a resource cannot be deleted.
 */
export default function ArchiveResourceButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!archived && !confirm('Archive this resource? Students will no longer see it. You can restore it later.')) return;

    setLoading(true);
    try {
      const res = await setResourceArchivedAction({ id, archived: !archived });
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
      className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm"
    >
      {loading ? 'Saving...' : archived ? 'Restore' : 'Archive'}
    </button>
  );
}
