'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reorderFAQAction } from '@/modules/admin/admin-faq.actions';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function ReorderFaqButton({ id, direction }: { id: string, direction: 'UP' | 'DOWN' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const handleReorder = async () => {
    setLoading(true);
    const res = await reorderFAQAction({ id, direction });
    if (res?.success) router.refresh();
    else alert((res as any)?.error || 'Error reordering FAQ');
    setLoading(false);
  };
  return (
    <button onClick={handleReorder} disabled={loading} className="p-2.5 border rounded min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-50 disabled:opacity-50">
      {direction === 'UP' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
    </button>
  );
}
