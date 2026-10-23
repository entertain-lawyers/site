"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, LogIn, MessageSquare, Send, Trash2 } from 'lucide-react';

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
  authorImage: string | null;
  canDelete?: boolean;
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const MAX_LENGTH = 2000;

function initials(name: string | null | undefined, email?: string | null) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 1).toUpperCase();
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Comments({ postId, postType = 'NEWS' }: { postId: string; postType?: string }) {
  const pathname = usePathname();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loginHref = useMemo(
    () => `/login?callbackUrl=${encodeURIComponent(pathname || '/')}`,
    [pathname]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const query = `postId=${encodeURIComponent(postId)}&type=${encodeURIComponent(postType)}`;
        const [commentsRes, sessionRes] = await Promise.all([
          fetch(`/api/comments?${query}`, { cache: 'no-store' }),
          fetch('/api/auth/session', { cache: 'no-store' }),
        ]);

        if (sessionRes.ok) {
          const session = await sessionRes.json().catch(() => null);
          if (!cancelled) setUser(session?.user ?? null);
        }
        if (commentsRes.ok) {
          const data = await commentsRes.json().catch(() => ({ comments: [] }));
          if (!cancelled) setComments(Array.isArray(data.comments) ? data.comments : []);
        }
      } catch {
        if (!cancelled) setError('Comments could not be loaded right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [postId, postType]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type: postType, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError('Please sign in to comment.');
        return;
      }
      if (!res.ok) {
        setError(data.message || data.error || 'Could not post your comment. Please try again.');
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setDraft('');
      setNotice('Comment posted — thanks for joining the discussion!');
    } catch {
      setError('Could not post your comment. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not delete that comment.');
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Could not delete that comment.');
    }
  };

  return (
    <section aria-labelledby="comments-heading" className="mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <h2
          id="comments-heading"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white dark:bg-navy-light"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Comments
        </h2>
        <span className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-bold text-navy dark:text-white">
          {loading ? '…' : comments.length}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {user ? (
          <form onSubmit={submit} className="mb-6">
            <label htmlFor="comment-body" className="mb-2 block text-sm font-semibold text-navy dark:text-white">
              Join the discussion
            </label>
            <textarea
              id="comment-body"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_LENGTH}
              rows={3}
              placeholder="Share your thoughts, questions, or corrections…"
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                Signed in as <span className="font-semibold text-text-secondary">{user.name || user.email}</span>
                <span className="ml-2" aria-live="polite">{draft.length}/{MAX_LENGTH}</span>
              </p>
              <button
                type="submit"
                disabled={submitting || !draft.trim()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold dark:text-navy dark:hover:bg-gold-light"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {submitting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Be respectful. Comments are public and may be moderated.
            </p>
          </form>
        ) : (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface-alt p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-navy dark:text-white">Sign in to join the discussion</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Only signed-in readers can comment. It takes a moment.
              </p>
            </div>
            <Link
              href={loginHref}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:bg-gold dark:text-navy dark:hover:bg-gold-light"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in to comment
            </Link>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
            {notice}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            No comments yet — be the first to share your thoughts.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {comment.authorImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={comment.authorImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    initials(comment.authorName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-sm font-bold text-navy dark:text-white">
                      {comment.authorName || 'Reader'}
                    </p>
                    <time
                      dateTime={comment.createdAt}
                      className="text-xs text-text-muted"
                      title={new Date(comment.createdAt).toLocaleString()}
                    >
                      {relativeTime(comment.createdAt)}
                    </time>
                    {comment.canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(comment.id)}
                        className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-semibold text-text-muted transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                        aria-label="Delete your comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-text-secondary">
                    {comment.content}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
