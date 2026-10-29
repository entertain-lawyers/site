'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteConsultationLawyerAction } from '@/modules/admin/admin-lawyer.actions';

export default function DeleteLawyerButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to remove Advocate "${name}" from consultation profiles?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await deleteConsultationLawyerAction({ id });
      if (res?.success) {
        router.refresh();
      } else {
        alert((res as any)?.error || 'Failed to delete lawyer profile.');
      }
    } catch {
      alert('An unexpected error occurred while deleting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-text-muted hover:text-red-600 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
      title={`Delete Advocate ${name}`}
      aria-label={`Delete Advocate ${name}`}
    >
      {loading ? <Loader2 size={18} className="animate-spin text-red-600" /> : <Trash2 size={18} />}
    </button>
  );
}
