'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteBuilderPageAction } from '@/modules/admin/admin-page.actions';

export default function DeletePageButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteBuilderPageAction({ id });
      if (res?.success) {
        router.refresh();
      } else {
        alert((res as { error?: string })?.error || 'Failed to delete page');
        setConfirming(false);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className={`inline-flex items-center justify-center px-4 py-2 border rounded-lg shadow-sm transition-colors disabled:opacity-50 ${
        confirming
          ? 'border-red-300 bg-red-500 text-white hover:bg-red-600'
          : 'border-black/5 dark:border-white/5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      }`}
      title={`Delete "${title}"`}
    >
      {pending ? 'Deleting…' : confirming ? 'Confirm delete' : 'Delete'}
    </button>
  );
}
