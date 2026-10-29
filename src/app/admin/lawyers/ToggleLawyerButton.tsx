'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toggleConsultationLawyerAvailabilityAction } from '@/modules/admin/admin-lawyer.actions';

export default function ToggleLawyerButton({ id, isAvailable }: { id: string; isAvailable: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await toggleConsultationLawyerAvailabilityAction({
        id,
        isAvailable: !isAvailable,
      });
      if (res?.success) {
        router.refresh();
      } else {
        alert((res as any)?.error || 'Failed to update availability.');
      }
    } catch {
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
        isAvailable
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60'
      }`}
      title="Click to toggle availability on consultation page"
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      )}
      <span>{isAvailable ? 'Available' : 'Hidden'}</span>
    </button>
  );
}
