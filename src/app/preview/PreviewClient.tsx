'use client';

import * as React from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import PostDetail from '@/components/posts/PostDetail';
import type { LatestPost } from '@/components/posts/LatestPostsSidebar';
import { POST_PREVIEW_STORAGE_KEY } from '@/lib/post-preview';

interface Draft {
  title: string;
  content: string;
  type: string;
  createdAt: string;
  featuredImage?: string | null;
  editorUrl?: string;
}

// localStorage is shared by every admin tab, so an already-open preview
// updates when the editor writes the next draft.
function readRawSnapshot(): string | null {
  return window.localStorage.getItem(POST_PREVIEW_STORAGE_KEY);
}

function subscribe(onChange: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === POST_PREVIEW_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/**
 * Renders the editor's unsaved draft through the exact public PostDetail
 * template used by /news, /blogs and /historical-facts. Nothing is written
 * anywhere — the draft lives only in this browser's localStorage.
 */
export default function PostPreviewClient({
  latestPosts,
  authorName,
  authorEmail,
}: {
  latestPosts: LatestPost[];
  authorName: string | null;
  authorEmail: string | null;
}) {
  const raw = React.useSyncExternalStore(
    subscribe,
    readRawSnapshot,
    () => null // SSR: no draft yet — the real value lands at hydration
  );

  const draft = useMemo(() => {
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as Draft;
      return {
        editorUrl: parsed.editorUrl || '/admin/posts/new',
        post: {
          id: 'preview',
          title: parsed.title || 'Untitled Draft',
          content: parsed.content,
          type: parsed.type,
          createdAt: new Date(parsed.createdAt),
          featuredImage: parsed.featuredImage ?? null,
          author: { email: authorEmail || '', name: authorName || undefined },
        },
      };
    } catch {
      return null;
    }
  }, [raw, authorName, authorEmail]);

  if (!draft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Eye className="h-10 w-10 text-black/10 dark:text-white/10" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold text-navy dark:text-white">Nothing to preview</h1>
        <p className="max-w-md text-sm text-text-secondary">
          This page shows a draft straight from the admin editor. Open the editor and press
          &ldquo;Preview&rdquo; to see how a post looks on the live site before publishing.
        </p>
        <Link
          href="/admin/posts"
          className="inline-flex min-h-[46px] items-center justify-center gap-2 bg-accent px-6 py-2.5 font-bold text-white transition-colors hover:bg-accent-dark"
        >
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Preview-only flag so admins never mistake a draft for the live page */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-navy px-4 py-2.5">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/90">
            Draft Preview — not published
          </p>
          <Link
            href={draft.editorUrl}
            className="inline-flex min-h-[36px] items-center gap-2 border border-white/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-gold hover:text-gold"
          >
            Back to Editor
          </Link>
        </div>
      </div>
      <div className="pb-16">
        <PostDetail post={draft.post} backUrl="/admin/posts" backLabel="Admin" latestPosts={latestPosts} showComments={false} />
      </div>
    </>
  );
}
