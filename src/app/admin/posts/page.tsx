import { auth } from '@/lib/auth';
import {
  getWordPressPosts,
  getWordPressCategories,
  mapCategoryToType,
  getWordPressBaseUrl,
  hasWordPressCredentials,
  WordPressApiError,
} from '@/lib/wordpress';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitize';
import PostsTableClient, { type AdminPostRow } from './PostsTableClient';

const PER_PAGE = 20;

function describeWordPressError(error: unknown): string {
  if (error instanceof WordPressApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'WordPress rejected the request. Drafts and trash need WP_AUTH_HEADER (or WP_AUTH_USERNAME + WP_AUTH_APP_PASSWORD) configured on the server.';
    }
    if (error.status === 404) {
      return 'The WordPress REST endpoint was not found. Check WP_ENGLISH_URL and WP_NEPALI_URL.';
    }
    if (error.status) {
      return `WordPress returned an error (HTTP ${error.status}).`;
    }
  }
  const message = error instanceof Error ? error.message : '';
  if (/invalid url|failed to parse url/i.test(message)) {
    return 'The WordPress URL is invalid. Check WP_ENGLISH_URL and WP_NEPALI_URL.';
  }
  if (/timed out|aborted/i.test(message)) {
    return 'WordPress did not respond in time. Try again in a moment.';
  }
  return 'WordPress could not be reached. Try again in a moment.';
}

/** WP-admin tabs: counts fetched with perPage=1 (headers carry the totals).
 *  Draft/trash statuses need WP credentials — skipped gracefully when absent. */
async function getStatusCounts(lang: 'en' | 'ne', search?: string, category?: number, hasWpAuth = false) {
  const base = {
    lang,
    perPage: 1,
    page: 1,
    embed: false as const,
    fields: 'id',
    search,
    categories: category ? [category] : undefined,
    throwOnError: true,
  };
  const settled = await Promise.allSettled([
    getWordPressPosts({ ...base }),
    getWordPressPosts({ ...base, status: 'publish' }),
    hasWpAuth ? getWordPressPosts({ ...base, status: 'draft' }) : Promise.resolve({ total: undefined }),
    hasWpAuth ? getWordPressPosts({ ...base, status: 'trash' }) : Promise.resolve({ total: undefined }),
  ]);
  const totalAt = (index: number) => {
    const result = settled[index];
    return result.status === 'fulfilled' ? (result.value as { total?: number }).total : undefined;
  };
  return {
    all: totalAt(0),
    published: totalAt(1),
    drafts: hasWpAuth ? totalAt(2) : undefined,
    trashed: hasWpAuth ? totalAt(3) : undefined,
    failed: settled.slice(0, 2).some((result) => result.status === 'rejected'),
  };
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; status?: string; search?: string; category?: string; page?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const sp = await searchParams;
  const lang: 'en' | 'ne' = sp.lang === 'ne' ? 'ne' : 'en';
  const status = ['publish', 'draft', 'trash'].includes(sp.status || '') ? sp.status! : 'all';
  const search = (sp.search || '').trim() || undefined;
  const category = sp.category ? Number(sp.category) || undefined : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const query = { lang, perPage: PER_PAGE, page, search, categories: category ? [category] : undefined, order: 'desc' as const, orderBy: 'date' as const };
  const hasWpAuth = hasWordPressCredentials();
  const privateStatus = status === 'draft' || status === 'trash';
  const lockedPrivateStatus = privateStatus && !hasWpAuth;

  // Main list + all tab counts + category options, in parallel. Each branch is
  // isolated so one WordPress failure cannot take down the whole page.
  const [listOutcome, counts, categoryOutcome] = await Promise.all([
    lockedPrivateStatus
      ? Promise.resolve({ ok: true as const, value: null })
      : getWordPressPosts({ ...query, embed: true, throwOnError: true, status: status === 'all' ? undefined : status })
          .then((value) => ({ ok: true as const, value }))
          .catch((error) => ({ ok: false as const, error })),
    getStatusCounts(lang, search, category, hasWpAuth).catch(() => ({
      all: undefined,
      published: undefined,
      drafts: undefined,
      trashed: undefined,
      failed: true,
    })),
    getWordPressCategories({ lang, perPage: 100, fields: 'id,name', throwOnError: true })
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => ({ ok: false as const, error })),
  ]);

  const listResult = listOutcome.ok ? listOutcome.value : null;
  const listError = listOutcome.ok ? null : listOutcome.error;
  const categoryResult = categoryOutcome.ok ? categoryOutcome.value : { data: [] as Array<{ id: number; name: string }> };
  const errorId = listError ? randomUUID().slice(0, 8) : null;
  if (listError) console.error(`[admin/posts] ${errorId}`, listError);

  const posts: AdminPostRow[] = (listResult?.data ?? []).map((p) => {
    const type = mapCategoryToType(p.categories, lang);
    const isModified = p.modified && p.modified !== p.date;
    // `_embed` payload typing is deliberately loose in the WP lib — normalize here.
    const embedded = (p._embedded || undefined) as {
      author?: Array<{ name?: string } | number>;
      'wp:term'?: Array<Array<{ name?: string }>>;
    } | undefined;
    const authorRaw = Array.isArray(embedded?.author) ? embedded.author[0] : undefined;
    const authorName = (authorRaw && typeof authorRaw === 'object' ? authorRaw?.name : undefined) || `WP Author (${p.author})`;
    const catNames =
      embedded?.['wp:term']?.[0]
        ?.map((c) => c?.name)
        .filter(Boolean)
        .join(', ') || '';

    const statusSuffix =
      p.status === 'publish' ? '' : p.status === 'trash' ? ' <span class="text-red-600 dark:text-red-400">— Trash</span>' : ' <span class="text-amber-600 dark:text-amber-400">— Draft</span>';

    return {
      id: String(p.id),
      // Sanitize server-side; the table is a client component whose SSR pass
      // cannot sanitize with a DOM.
      titleHtml: sanitizeHtml((p.title?.rendered || '') + statusSuffix),
      type,
      status: p.status === 'publish' ? 'PUBLISHED' : p.status === 'trash' ? 'TRASH' : 'DRAFT',
      authorName,
      categories: catNames,
      dateHeadline: isModified ? 'Last Modified' : 'Published',
      dateValue: new Date(isModified ? p.modified : p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      currentTab: status,
      lang,
      wpEditUrl: '',
    };
  });

  const wpBase = { en: getWordPressBaseUrl('en').replace(/\/wp-json.*$/, ''), ne: getWordPressBaseUrl('ne').replace(/\/wp-json.*$/, '') };

  // Filter link builder keeping current language/search/category context.
  const tabHref = (nextStatus: string) => {
    const params = new URLSearchParams();
    if (lang === 'ne') params.set('lang', 'ne');
    if (nextStatus !== 'all') params.set('status', nextStatus);
    if (search) params.set('search', search);
    if (category) params.set('category', String(category));
    const qs = params.toString();
    return `/admin/posts${qs ? `?${qs}` : ''}`;
  };

  const tabs = [
    { key: 'all', label: 'All', count: counts.all, locked: false },
    { key: 'publish', label: 'Published', count: counts.published, locked: false },
    { key: 'draft', label: 'Drafts', count: counts.drafts, locked: !hasWpAuth },
    { key: 'trash', label: 'Trash', count: counts.trashed, locked: !hasWpAuth },
  ];

  const activeCount =
    status === 'all'
      ? counts.all
      : status === 'publish'
        ? counts.published
        : status === 'draft'
          ? counts.drafts
          : counts.trashed;
  const total = activeCount ?? listResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const shownTotal = activeCount ?? listResult?.total;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Posts</h1>
          <p className="mt-2 text-text-secondary font-medium">
            News, blogs &amp; facts — full control over WordPress articles without leaving the panel.
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-3">
          {/* Language switch */}
          <div className="flex rounded-xl border border-border overflow-hidden" role="group" aria-label="Content language">
            <Link
              href={`/admin/posts${status !== 'all' ? `?status=${status}` : ''}`}
              className={`px-4 py-2.5 text-sm font-bold transition-colors ${lang === 'en' ? 'bg-navy text-white' : 'bg-white dark:bg-zinc-800 text-text-secondary hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
            >
              English
            </Link>
            <Link
              href={`/admin/posts?lang=ne${status !== 'all' ? `&status=${status}` : ''}`}
              className={`px-4 py-2.5 text-sm font-bold transition-colors ${lang === 'ne' ? 'bg-navy text-white' : 'bg-white dark:bg-zinc-800 text-text-secondary hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
            >
              नेपाली
            </Link>
          </div>
          <Link
            href={`/admin/posts/new${lang === 'ne' ? '?lang=ne' : ''}`}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Post
          </Link>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-medium">
        {tabs.map((tab) => (
          tab.locked ? (
            <span
              key={tab.key}
              title="Requires WordPress credentials (WP_AUTH_HEADER or WP_AUTH_USERNAME + WP_AUTH_APP_PASSWORD)"
              className="px-3 py-1.5 rounded-lg text-text-muted/60 font-bold cursor-not-allowed select-none"
              aria-disabled="true"
            >
              🔒 {tab.label} ({tab.count})
            </span>
          ) : (
            <Link
              key={tab.key}
              href={tabHref(tab.key)}
              className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
                status === tab.key
                  ? 'bg-accent/10 text-accent dark:bg-accent/20'
                  : 'text-text-secondary hover:text-navy dark:text-white/60 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label} <span className="tabular-nums">({tab.count ?? '—'})</span>
            </Link>
          )
        ))}
      </div>

      {tabs.some(t => t.locked) ? (
        <p className="mb-4 text-xs text-text-muted font-medium">
          🔒 Drafts &amp; Trash need WordPress sign-in credentials — full post control works once <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800">WP_AUTH_HEADER</code> is configured in the environment.
        </p>
      ) : null}

      {counts.failed ? (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Post counts are unavailable because WordPress did not answer. The list below is still shown.
        </p>
      ) : null}

      {!categoryOutcome.ok ? (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Categories could not be loaded, so the category filter is empty.
        </p>
      ) : null}

      {/* Filter bar — category + search, WP-admin style */}
      <form action="/admin/posts" method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {lang === 'ne' ? <input type="hidden" name="lang" value="ne" /> : null}
        {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
        <div>
          <label htmlFor="category" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Category</label>
          <select
            id="category"
            name="category"
            defaultValue={category || ''}
            className="px-4 py-2 rounded-lg border border-border bg-white dark:bg-zinc-800 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">All categories</option>
            {categoryResult.data.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="post-search" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Search</label>
          <input
            id="post-search"
            name="search"
            defaultValue={search || ''}
            placeholder={`Search ${lang === 'ne' ? 'Nepali' : 'English'} posts…`}
            className="w-full px-4 py-2 rounded-lg border border-border bg-white dark:bg-zinc-800 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy/90 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Result count + pagination header, WP-admin style */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted font-medium">
        <span>{shownTotal === undefined ? 'Count unavailable' : `${shownTotal} item${shownTotal === 1 ? '' : 's'}`}</span>
        {totalPages > 1 ? (
          <span>
            Page {page} of {totalPages}
          </span>
        ) : null}
      </div>

      <div className="mb-6 flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={`/admin/posts?${new URLSearchParams({
              ...(lang === 'ne' ? { lang: 'ne' } : {}),
              ...(status !== 'all' ? { status } : {}),
              ...(search ? { search } : {}),
              ...(category ? { category: String(category) } : {}),
              page: String(page - 1),
            }).toString()}`}
            className="px-4 py-2 rounded-lg border border-border bg-white dark:bg-zinc-800 text-sm font-bold text-text-primary hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
          >
            ← Prev
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={`/admin/posts?${new URLSearchParams({
              ...(lang === 'ne' ? { lang: 'ne' } : {}),
              ...(status !== 'all' ? { status } : {}),
              ...(search ? { search } : {}),
              ...(category ? { category: String(category) } : {}),
              page: String(page + 1),
            }).toString()}`}
            className="px-4 py-2 rounded-lg border border-border bg-white dark:bg-zinc-800 text-sm font-bold text-text-primary hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Next →
          </Link>
        ) : null}
      </div>

      {lockedPrivateStatus ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <h2 className="text-lg font-extrabold text-amber-900 dark:text-amber-200">This view needs WordPress credentials</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800 dark:text-amber-200">
            Drafts and trash are private WordPress records. Configure <code>WP_AUTH_HEADER</code> (or <code>WP_AUTH_USERNAME</code> and <code>WP_AUTH_APP_PASSWORD</code>) on the server, then reload.
          </p>
          <Link href="/admin/posts" className="mt-5 inline-flex rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy/90">
            Back to all posts
          </Link>
        </div>
      ) : listError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <h2 className="text-lg font-extrabold text-red-900 dark:text-red-200">Posts could not be loaded</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-red-800 dark:text-red-200">{describeWordPressError(listError)}</p>
          {errorId ? <p className="mt-3 text-xs font-mono text-red-700/80 dark:text-red-300/80">Reference: {errorId}</p> : null}
          <Link href={tabHref(status)} className="mt-5 inline-flex rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy/90">
            Try again
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
          <PostsTableClient posts={posts} role={session.user.role} wpAdminBase={wpBase} />
        </div>
      )}

      {/* Bottom pagination */}
      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const p = start + i;
            if (p > totalPages) return null;
            const params = new URLSearchParams({
              ...(lang === 'ne' ? { lang: 'ne' } : {}),
              ...(status !== 'all' ? { status } : {}),
              ...(search ? { search } : {}),
              ...(category ? { category: String(category) } : {}),
              page: String(p),
            });
            return (
              <Link
                key={p}
                href={`/admin/posts?${params.toString()}`}
                className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                  p === page
                    ? 'bg-navy text-white'
                    : 'bg-white dark:bg-zinc-800 border border-border text-text-secondary hover:bg-slate-50 dark:hover:bg-zinc-700'
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const dynamic = 'force-dynamic';
