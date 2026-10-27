'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Puck, type Data } from '@measured/puck';
import { builderConfig } from '@/lib/puck/config';
import { updateBuilderPageAction } from '@/modules/admin/admin-page.actions';

/**
 * The Elementor-style drag & drop editor (Puck) for a visual page.
 * "Publish" in the builder saves the latest document + root metadata;
 * making the page live on the site is the separate Publish toggle on the
 * Visual Pages list (/admin/pages).
 */
export default function PageEditorClient({
  id,
  slug,
  initialData,
}: {
  id: string;
  slug: string;
  initialData: Data;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = useCallback(
    async (data: Data) => {
      setSaving(true);
      setError(null);
      try {
        const rootProps = (data?.root?.props || {}) as Record<string, unknown>;
        const title = typeof rootProps.title === 'string' && rootProps.title.trim() ? rootProps.title : slug;

        const res = await updateBuilderPageAction({
          id,
          title,
          metaTitle: typeof rootProps.metaTitle === 'string' ? rootProps.metaTitle : undefined,
          metaDesc: typeof rootProps.metaDesc === 'string' ? rootProps.metaDesc : undefined,
          data: data as unknown as Record<string, unknown>,
        });

        if (res?.success) {
          setSavedAt(new Date().toLocaleTimeString());
          router.refresh();
        } else {
          setError((res as { error?: string })?.error || 'Failed to save');
        }
      } catch {
        setError('Failed to save');
      }
      setSaving(false);
    },
    [id, slug, router]
  );

  return (
    <div className="h-[calc(100vh-4rem)]">
      <Puck
        config={builderConfig}
        data={initialData}
        onPublish={handlePublish}
        overrides={{
          headerActions: () => (
            <div className="flex items-center gap-3 text-xs font-medium" key="page-editor-status">
              {saving ? <span className="text-slate-500">Saving…</span> : null}
              {!saving && error ? <span className="text-red-600">{error}</span> : null}
              {!saving && !error && savedAt ? <span className="text-green-600">Saved {savedAt}</span> : null}
            </div>
          ),
        }}
      />
    </div>
  );
}
