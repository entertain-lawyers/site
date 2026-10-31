'use client';

import { deleteResourceAction } from '@/modules/admin/admin-resource.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteResourceButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this resource? This will also remove any associated document files.')) return;

    setLoading(true);
    try {
      const res = await deleteResourceAction({ id });
      if (!res.success) {
        alert(res.error);
        // e.g. "Resource not found" after it was deleted in another tab.
        router.refresh();
      } else {
        if (res.data.filesFailed > 0) {
          // The resource is gone; only the stored PDF is left behind.
          alert('The resource was deleted, but its stored PDF could not be removed from file storage. It is logged on the server for manual cleanup.');
        }
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}
