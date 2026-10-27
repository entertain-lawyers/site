'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { publishBuilderPageAction } from '@/modules/admin/admin-page.actions';

export default function PublishPageButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const publish = () => {
    startTransition(async () => {
      const res = await publishBuilderPageAction({ id, status: published ? 'DRAFT' : 'PUBLISHED' });
      if (res?.success) {
        router.refresh();
      } else {
        alert((res as { error?: string })?.error || 'Failed to update status');
      }
    });
  };

  const published = status === 'PUBLISHED';

  return (
    <button
      type="button"
      onClick={publish}
      disabled={pending}
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        published
          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
      }`}
    >
      {pending ? '…' : published ? 'Unpublish' : 'Publish'}
    </button>
  );
}
