'use client';

import { deletePostAction } from '@/modules/admin/admin-post.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeletePostButton({ id, type }: { id: string, type?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setLoading(true);
    try {
      const res = await deletePostAction({ id: Number(id), type });
      if (!res.success) {
        alert(res.error);
      } else {
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
