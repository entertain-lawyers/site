'use client';
import { useState } from 'react';
import { deleteGalleryAction } from '@/modules/admin/admin-gallery.actions';

export default function DeleteGalleryButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this gallery and ALL its images?')) return;
    setLoading(true);
    try {
      const res = await deleteGalleryAction({ id });
      if (!res?.success) alert((res as any)?.error || 'Error deleting gallery');
    } catch {
      // Network failure or server crash: the record may still exist.
      alert('The delete request could not be completed. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handleDelete} disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}
