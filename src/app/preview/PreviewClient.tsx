'use client';

import * as React from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import { Eye, ArrowLeft, ChevronRight, FileText } from 'lucide-react';
import PostDetail from '@/components/posts/PostDetail';
import ArticleBody from '@/components/posts/ArticleBody';
import AuthorBioTrigger from '@/components/author/AuthorBioTrigger';
import CaseCategoryBadge from '@/components/study/CaseCategoryBadge';
import type { LatestPost } from '@/components/posts/LatestPostsSidebar';
import { POST_PREVIEW_STORAGE_KEY, isStudyResourceDraft, type PostPreviewDraft } from '@/lib/post-preview';

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

function StudyResourcePreview({
  draft,
}: {
  draft: {
    editorUrl: string;
    post: {
      id: string;
      title: string;
      content: string;
      type: string;
      createdAt: Date;
      featuredImage: string | null;
      caseCategory?: string | null;
      author: {
        email: string;
        name: string;
        image: string | null;
        bio: string | null;
        website: string | null;
        role: string | null;
      };
    };
  };
}) {
  const { post, editorUrl } = draft;
  const author = {
    name: post.author.name || 'Entertain Lawyers',
    image: post.author.image || null,
    bio: post.author.bio || 'Comprehensive study resources and legal materials.',
    role: post.author.role || 'Contributor',
    website: post.author.website || null,
    email: post.author.email || null,
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center space-x-2 text-xs sm:text-sm text-text-muted">
            <li>
              <Link href={editorUrl} className="hover:text-accent font-medium transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Editor
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-border-strong" />
            </li>
            <li className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
              {post.type || 'Study Resource'}
            </li>
          </ol>
        </nav>

        {/* Content Header */}
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md bg-accent/10 text-accent border border-accent/20 tracking-wider uppercase">
              <FileText className="w-3.5 h-3.5" />
              {post.type || 'Study Material'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-gold/10 text-gold-dark border border-gold/30 tracking-wider uppercase">
              Draft Preview
            </span>
            {post.caseCategory && (
              <CaseCategoryBadge category={post.caseCategory} size="sm" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-navy dark:text-white mb-6 leading-tight tracking-tight break-words">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-muted uppercase tracking-wider text-xs">Author:</span>
              <AuthorBioTrigger author={author} size="sm" showName />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-muted uppercase tracking-wider text-xs">Created:</span>
              <span>{post.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-border shadow-sm max-h-[460px] aspect-video w-full bg-slate-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Reading Body */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-sm mb-10">
          <ArticleBody html={post.content} toc />
        </div>

        {/* About Author Section */}
        <section aria-labelledby="preview-author-heading" className="bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="border-b border-border pb-3 mb-5">
            <h2 id="preview-author-heading" className="text-xs font-bold uppercase tracking-wider text-text-muted">
              About Author
            </h2>
          </div>
          <div className="flex items-start gap-4 sm:gap-5">
            <AuthorBioTrigger author={author} size="lg" showName={false} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-navy dark:text-white text-lg">
                  {author.name}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent">
                  {author.role}
                </span>
              </div>
              {author.bio && (
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {author.bio}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Renders the editor's unsaved draft through the matching template:
 * - Study resources render through the focused legal reading view (matching /read/[resourceId])
 * - Editorial posts render through PostDetail (matching /news, /blogs and /historical-facts)
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
      const parsed = JSON.parse(raw) as PostPreviewDraft;
      const resolvedName = parsed.author?.name || authorName || 'Entertain Lawyers';
      const resolvedEmail = parsed.author?.email || authorEmail || '';
      return {
        contentType: parsed.contentType,
        editorUrl: parsed.editorUrl || '/admin/posts/new',
        post: {
          id: 'preview',
          title: parsed.title || 'Untitled Draft',
          content: parsed.content,
          type: parsed.type,
          createdAt: new Date(parsed.createdAt),
          featuredImage: parsed.featuredImage ?? null,
          caseCategory: parsed.caseCategory ?? null,
          author: {
            email: resolvedEmail,
            name: resolvedName,
            image: parsed.author?.image ?? null,
            bio: parsed.author?.bio ?? null,
            website: parsed.author?.website ?? null,
            role: parsed.author?.role ?? null,
          },
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

  // Explicit RESOURCE vs POST identification is primary; legacy URL/type heuristics serve as fallback
  const isStudyResource = isStudyResourceDraft({
    contentType: draft.contentType,
    editorUrl: draft.editorUrl,
    type: draft.post.type,
  });

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
        {isStudyResource ? (
          <StudyResourcePreview draft={draft} />
        ) : (
          <PostDetail
            post={draft.post}
            backUrl={draft.editorUrl || '/admin/posts'}
            backLabel="Back to Editor"
            latestPosts={latestPosts}
            showComments={false}
          />
        )}
      </div>
    </>
  );
}
