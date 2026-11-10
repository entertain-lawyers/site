'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bulkUpdatePostStatusAction, deletePostAction } from '@/modules/admin/admin-post.actions';
import { getPublicPostUrl } from '@/lib/post-url';
import AuthorBioTrigger, { AuthorInfo } from '@/components/author/AuthorBioTrigger';

export interface AdminPostRow {
  id: string;
  titleHtml: string;
  type: string;
  status: 'PUBLISHED' | 'DRAFT' | 'TRASH';
  authorName: string;
  author?: AuthorInfo | null;
  categories: string;
  dateHeadline: 'Published' | 'Last Modified';
  dateValue: string;
  currentTab: string;
  lang: 'en' | 'ne';
  wpEditUrl: string;
}

/**
 * Posts table with WP-admin parity: per-row selection, select-all,
 * bulk actions (trash / restore / publish / draft / delete permanently),
 * and links to the WP editor for deep changes.
 */
export default function PostsTableClient({
  posts,
  role,
  wpAdminBase,
}: {
  posts: AdminPostRow[];
  role: string;
  wpAdminBase: { en: string; ne: string };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const lang = posts[0]?.lang || 'en';
  const inTrash = posts.some(p => p.status === 'TRASH');

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => (prev.size === posts.length ? new Set() : new Set(posts.map(p => p.id))));
  };

  const runBulk = async (rawAction: FormDataEntryValue | null) => {
    const action = String(rawAction || bulkAction || '');
    if (!action || selected.size === 0) return;

    const confirmed =
      action === 'DELETE_PERMANENTLY'
        ? window.confirm(`Permanently delete ${selected.size} post(s)? This cannot be undone.`)
        : true;
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    const res = await bulkUpdatePostStatusAction({
      ids: Array.from(selected).map(Number),
      lang,
      action: action as 'TRASH' | 'PUBLISH' | 'DRAFT' | 'DELETE_PERMANENTLY',
    });
    setBusy(false);
    if (res?.success) {
      const { succeeded, failed } = res.data;
      setMessage(
        `Done: ${succeeded} succeeded${failed ? `, ${failed} failed` : ''}.`
      );
      setSelected(new Set());
      setBulkAction('');
      router.refresh();
    } else {
      setMessage((res as { error?: string })?.error || 'Failed to update posts');
    }
  };

  const updateSingleStatus = async (
    id: string,
    action: 'PUBLISH' | 'DRAFT' | 'TRASH' | 'DELETE_PERMANENTLY',
    promptMessage?: string
  ) => {
    if (promptMessage && !window.confirm(promptMessage)) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await bulkUpdatePostStatusAction({
        ids: [Number(id)],
        lang,
        action,
      });
      if (res?.success) {
        if (action === 'PUBLISH') setMessage('Post published successfully');
        else if (action === 'DRAFT') setMessage('Post moved to draft');
        else if (action === 'TRASH') setMessage('Post archived to trash');
        else if (action === 'DELETE_PERMANENTLY') setMessage('Post permanently deleted');
        router.refresh();
      } else {
        setMessage((res as { error?: string })?.error || 'Action failed');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSingle = async (post: AdminPostRow) => {
    if (post.status === 'TRASH') {
      await updateSingleStatus(
        post.id,
        'DELETE_PERMANENTLY',
        'Permanently delete this post? This cannot be undone.'
      );
      return;
    }
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await deletePostAction({ id: Number(post.id), type: post.type, lang: post.lang });
      if (res?.success) {
        setMessage('Post deleted');
        router.refresh();
      } else {
        setMessage((res as { error?: string })?.error || 'Delete failed');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const typeDot = (type: string) =>
    type === 'NEWS'
      ? 'bg-blue-500'
      : type.includes('NEPALI')
      ? 'bg-red-500'
      : type === 'BLOG'
      ? 'bg-purple-500'
      : type === 'OPINION'
      ? 'bg-amber-500'
      : 'bg-orange-500';

  return (
    <div>
      {/* WP-admin parity bar: "Bulk Actions › Apply" + live result message */}
      <div className="px-8 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50/60 dark:bg-zinc-900/60 flex flex-wrap items-center gap-3">
        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value)}
          disabled={busy || posts.length === 0}
          className="px-4 py-2 rounded-lg border border-border bg-white dark:bg-zinc-800 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
          aria-label="Bulk action"
        >
          <option value="">Bulk actions</option>
          {inTrash ? (
            <>
              <option value="PUBLISH">Restore</option>
              <option value="DELETE_PERMANENTLY">Delete permanently</option>
            </>
          ) : (
            <>
              <option value="PUBLISH">Publish</option>
              <option value="DRAFT">Set to draft</option>
              <option value="TRASH">Move to trash</option>
            </>
          )}
        </select>
        <button
          type="button"
          onClick={() => runBulk(bulkAction)}
          disabled={busy || !bulkAction || selected.size === 0}
          className="px-5 py-2 rounded-lg text-sm font-bold bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40"
        >
          {busy ? 'Working…' : 'Apply'}
        </button>
        <span className="text-sm text-text-muted font-medium">
          {selected.size > 0 ? `${selected.size} selected` : ''}
        </span>
        {message ? <span className="text-sm font-medium text-green-700 dark:text-green-400">{message}</span> : null}
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={posts.length > 0 && selected.size === posts.length}
                  onChange={toggleAll}
                  disabled={busy}
                  aria-label="Select all posts"
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Author</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Categories</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Type</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Date</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-5">
                    <input
                      type="checkbox"
                      checked={selected.has(post.id)}
                      onChange={() => toggle(post.id)}
                      disabled={busy}
                      aria-label={`Select ${post.titleHtml}`}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-5 text-sm font-bold text-navy dark:text-white min-w-[280px]">
                    <span dangerouslySetInnerHTML={{ __html: post.titleHtml }} />
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    <AuthorBioTrigger author={post.author || { name: post.authorName }} size="xs" showName lang={post.lang} />
                  </td>
                  <td className="px-4 py-5 text-sm font-medium text-text-secondary min-w-[140px]">{post.categories || '—'}</td>
                  <td className="px-4 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${typeDot(post.type)}`} />
                      {post.type === 'UNKNOWN' ? (post.categories || 'Uncategorized') : post.type.replace('NEPALI_', 'NEPALI: ').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    <strong className={post.dateHeadline === 'Last Modified' ? 'font-bold text-navy dark:text-white' : 'font-medium'}>{post.dateHeadline}</strong>
                    <br />
                    <span className="text-xs">{post.dateValue}</span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    {(role === 'ADMIN' || role === 'EDITOR') && (
                      <Link
                        href={`/admin/posts/${post.id}/edit?lang=${post.lang}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm mr-2"
                      >
                        Edit
                      </Link>
                    )}
                    <Link
                      href={getPublicPostUrl({ id: post.id, type: post.type, lang: post.lang })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                    >
                      View
                    </Link>
                    {post.status !== 'TRASH' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSingleStatus(
                            post.id,
                            post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISH',
                            post.status === 'PUBLISHED'
                              ? 'Move this post to draft? Visitors will no longer see it until you publish it again.'
                              : undefined
                          )
                        }
                        disabled={busy}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm ${
                          post.status === 'PUBLISHED'
                            ? 'border border-black/5 dark:border-white/5 text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}
                      >
                        {post.status === 'PUBLISHED' ? 'Move to Draft' : 'Publish'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateSingleStatus(
                          post.id,
                          post.status === 'TRASH' ? 'PUBLISH' : 'TRASH',
                          post.status === 'TRASH'
                            ? undefined
                            : 'Archive this post? It will be moved to trash and hidden from the public site.'
                        )
                      }
                      disabled={busy}
                      className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm"
                    >
                      {post.status === 'TRASH' ? 'Restore' : 'Archive'}
                    </button>
                    {(role === 'ADMIN' || role === 'EDITOR') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(post)}
                        disabled={busy}
                        className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm ml-2 disabled:opacity-50 font-medium text-sm"
                      >
                        {post.status === 'TRASH' ? 'Delete forever' : 'Delete'}
                      </button>
                    )}
                    <a
                      href={`${wpAdminBase[post.lang]}/wp-admin/post.php?post=${post.id}&action=edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden 2xl:inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm ml-2"
                    >
                      WP Editor ↗
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-navy dark:text-white">No posts found</h3>
                    <p className="text-sm text-text-secondary">No posts match this filter.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
