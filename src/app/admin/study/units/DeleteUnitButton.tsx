'use client';

import { deleteUnitAction } from '@/modules/admin/admin-unit.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function DeleteUnitButton({ id, name }: { id: string; name?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const label = name ? `unit "${name}"` : 'this unit';
    if (!confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await deleteUnitAction({ id });
      if (!res.success) {
        alert(res.error || 'Failed to delete unit');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete unit"
      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-black/5 dark:border-white/5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm"
    >
      <Trash2 className="w-4 h-4" />
      <span>{loading ? 'Deleting...' : 'Delete'}</span>
    </button>
  );
}
