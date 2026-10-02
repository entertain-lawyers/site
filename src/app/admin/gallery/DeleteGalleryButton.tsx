'use client';
import { useState } from 'react';
import { deleteGalleryAction } from '@/modules/admin/admin-gallery.actions';

export default function DeleteGalleryButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this gallery and ALL its images?')) return;
    setLoading(true);
    const res = await deleteGalleryAction({ id });
    if (!res?.success) alert((res as any)?.error || 'Error deleting gallery');
    setLoading(false);
  };
  return (
    <button onClick={handleDelete} disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">
      Delete
    </button>
  );
}
