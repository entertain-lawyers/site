"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, LogIn, MessageSquare, Send, Trash2 } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

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

export default function Comments({
  postId,
  postType = 'NEWS',
  variant = 'news',
}: {
  postId: string;
  postType?: string;
  variant?: 'news' | 'study';
}) {
  const pathname = usePathname();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, { count: number; active: boolean }>>({});

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

  const toggleHelpful = (id: string) => {
    setHelpfulVotes((prev) => {
      const current = prev[id] || { count: 0, active: false };
      return {
        ...prev,
        [id]: {
          count: current.active ? Math.max(0, current.count - 1) : current.count + 1,
          active: !current.active,
        },
      };
    });
  };

  const replyTo = (authorName: string | null) => {
    const name = authorName || 'Reader';
    setDraft((prev) => (prev ? `${prev} @${name} ` : `@${name} `));
    const el = document.getElementById('comment-body');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Study / Law Notes / Case Laws Redesigned Discussion Layout
  if (variant === 'study') {
    return (
      <section aria-labelledby="discussion-heading" className="mt-10 scroll-mt-24 rounded-2xl border border-border/80 bg-surface/90 dark:bg-zinc-900/60 p-6 sm:p-8 shadow-xs">
        {/* Discussion Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="discussion-heading" className="text-lg sm:text-xl font-bold text-navy dark:text-white leading-tight">
                Discussion & Study Inquiries
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Discuss legal provisions, ask questions, or share study insights with peers.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-alt border border-border text-navy dark:text-white">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {loading ? '…' : `${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}`}
          </span>
        </div>

        {/* Composer Form */}
        <div className="pt-6">
          {user ? (
            <form onSubmit={submit} className="mb-8">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white text-xs font-bold shadow-xs">
                  {user.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initials(user.name, user.email)
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-bold text-navy dark:text-white">{user.name || user.email}</span>
                  <span className="ml-2 text-text-muted">• Contributing to study discussion</span>
                </div>
              </div>

              <div className="relative rounded-xl border border-border bg-background focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                <textarea
                  id="comment-body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={MAX_LENGTH}
                  rows={3}
                  placeholder="Have a question or insight on this note? Share your perspective, cite relevant sections, or ask for clarification..."
                  className="w-full resize-y rounded-t-xl bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-border/50 bg-surface-alt/40 rounded-b-xl text-xs text-text-muted">
                  <span className="text-[11px] text-text-muted hidden sm:inline">
                    💡 Tip: Reference specific statutes or case names to help others.
                  </span>
                  <div className="flex items-center gap-3 ml-auto">
                    <span aria-live="polite" className="text-[11px]">{draft.length}/{MAX_LENGTH}</span>
                    <MotionButton
                      type="submit"
                      disabled={submitting || !draft.trim()}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-bold text-white transition-all hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                      {submitting ? 'Posting…' : 'Post Comment'}
                    </MotionButton>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-8 rounded-xl border border-dashed border-border bg-surface-alt/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <LogIn className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-navy dark:text-white">Join the study discussion</p>
                  <p className="text-xs text-text-muted">
                    Sign in to ask questions, share case notes, and exchange insights with fellow students.
                  </p>
                </div>
              </div>
              <Link
                href={loginHref}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white hover:bg-accent-hover transition-colors shadow-xs"
              >
                Sign in to comment
              </Link>
            </div>
          )}

          {/* Feedback messages */}
          <AnimatePresence initial={false}>
            {error && (
              <Appear key="error">
                <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              </Appear>
            )}
            {notice && (
              <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                {notice}
              </p>
            )}
          </AnimatePresence>

          {/* Comments List */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
              Loading discussion…
            </div>
          ) : comments.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-border/60 bg-surface-alt/30">
              <div className="h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-navy dark:text-white mb-1">
                No inquiries or comments yet
              </h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Be the first to start the discussion! Ask a question or share your key takeaways from this note.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => {
                const helpful = helpfulVotes[comment.id] || { count: 0, active: false };
                return (
                  <li
                    key={comment.id}
                    className="rounded-xl border border-border/80 bg-background/60 p-4 transition-all hover:border-border"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-navy to-accent text-xs font-bold text-white shadow-xs">
                        {comment.authorImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={comment.authorImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          initials(comment.authorName)
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                          <span className="text-sm font-bold text-navy dark:text-white">
                            {comment.authorName || 'Student'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">
                            Law Student
                          </span>
                          <span className="text-xs text-text-muted">• {relativeTime(comment.createdAt)}</span>

                          {comment.canDelete && (
                            <button
                              type="button"
                              onClick={() => remove(comment.id)}
                              className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-text-muted hover:text-red-600 transition-colors cursor-pointer"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="text-[11px]">Delete</span>
                            </button>
                          )}
                        </div>

                        <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line break-words">
                          {comment.content}
                        </p>

                        {/* Interactive Action Bar */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-text-muted pt-2 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => toggleHelpful(comment.id)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                              helpful.active
                                ? 'text-accent font-bold bg-accent/10'
                                : 'hover:text-accent hover:bg-surface-alt'
                            }`}
                          >
                            <span>👍</span>
                            <span>Helpful</span>
                            {helpful.count > 0 && <span className="font-semibold">({helpful.count})</span>}
                          </button>

                          <button
                            type="button"
                            onClick={() => replyTo(comment.authorName)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:text-accent hover:bg-surface-alt transition-colors cursor-pointer text-xs"
                          >
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    );
  }

  // Classic News Version (kept 100% as is per requirement)
  return (
    <section aria-labelledby="comments-heading" className="mt-8 scroll-mt-24 border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 bg-navy px-4 py-2.5 dark:bg-zinc-900 dark:border-b dark:border-white/10">
        <h2
          id="comments-heading"
          className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-white"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Comments
        </h2>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
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
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                Signed in as <span className="font-semibold text-text-secondary">{user.name || user.email}</span>
                <span className="ml-2" aria-live="polite">{draft.length}/{MAX_LENGTH}</span>
              </p>
              <MotionButton
                type="submit"
                disabled={submitting || !draft.trim()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold dark:text-navy dark:hover:bg-gold-light"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {submitting ? 'Posting…' : 'Post comment'}
              </MotionButton>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Be respectful. Comments are public and may be moderated.
            </p>
          </form>
        ) : (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-surface-alt p-4 sm:flex-row sm:items-center sm:justify-between">
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

        <AnimatePresence initial={false}>
        {error && (
          <Appear key="error">
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
          </Appear>
        )}
        </AnimatePresence>
        {notice && (
          <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
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
