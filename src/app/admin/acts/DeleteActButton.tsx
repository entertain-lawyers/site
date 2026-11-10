'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteActAction } from '@/modules/admin/admin-act.actions';

export default function DeleteActButton({ id, title }: { id: string; title?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title || 'this act'}"?`);
    if (!confirmed) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      aria-label="Delete act"
      className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
