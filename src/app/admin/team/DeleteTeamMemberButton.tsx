'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTeamMemberAction } from '@/modules/admin/admin-team.actions';
import { Trash2 } from 'lucide-react';

export default function DeleteTeamMemberButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    setLoading(true);
    const res = await deleteTeamMemberAction({ id });
    if (!res?.success) {
      alert((res as any)?.error || 'Error deleting member');
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
      title="Delete Member"
    >
      <Trash2 size={20} />
    </button>
  );
}
