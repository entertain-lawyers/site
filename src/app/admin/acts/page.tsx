import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, FileText, ExternalLink, Filter } from 'lucide-react';
import DeleteActButton from './DeleteActButton';
import { ACT_CATEGORIES } from '@/modules/acts/act.constants';

export default async function AdminActsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { q, category, status } = await searchParams;

  const where: Record<string, unknown> = {};

  if (category && category !== 'ALL') {
    where.category = category;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (q && q.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: 'insensitive' } },
      { titleEn: { contains: q.trim(), mode: 'insensitive' } },
      { slug: { contains: q.trim(), mode: 'insensitive' } },
      { description: { contains: q.trim(), mode: 'insensitive' } },
    ];
  }

  const acts = await prisma.actLaw.findMany({
    where,
    orderBy: { title: 'asc' },
  });

  const categoryMap = new Map<string, string>(ACT_CATEGORIES.map((c) => [c.value, c.label]));

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
            Acts & Laws
          </h1>
          <p className="mt-1 text-sm text-text-secondary font-medium">
            Manage Nepal’s Constitution, Acts, Rules, Ordinances, and Legal Documents.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/admin/acts/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Act / Law
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form method="GET" className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-6 border border-black/5 dark:border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search by title or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-sm text-navy dark:text-white focus:outline-none focus:border-accent"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56">
            <select
              name="category"
              defaultValue={category || 'ALL'}
              className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-sm text-navy dark:text-white focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Categories</option>
              {ACT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-40">
            <select
              name="status"
              defaultValue={status || 'ALL'}
              className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-sm text-navy dark:text-white focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Filter Submit Button */}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-light dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filter
          </button>

          {(q || (category && category !== 'ALL') || (status && status !== 'ALL')) && (
            <Link
              href="/admin/acts"
              className="px-3 py-2.5 text-xs text-center text-text-muted hover:text-text-primary underline font-medium"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  Title & Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  PDF File
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
              {acts.length > 0 ? (
                acts.map((act, idx) => (
                  <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-text-muted">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-[240px]">
                        <p className="text-sm font-bold text-navy dark:text-white leading-snug">
                          {act.title}
                        </p>
                        {act.titleEn && act.titleEn !== act.title && (
                          <p className="text-xs text-text-muted mt-0.5">{act.titleEn}</p>
                        )}
                        <p className="text-[11px] font-mono text-text-muted mt-1 opacity-75">
                          slug: /{act.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-slate-100 dark:bg-zinc-800 text-text-secondary border border-black/5 dark:border-white/5">
                        {categoryMap.get(act.category) || act.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {act.documentUrl ? (
                        <a
                          href={act.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>PDF Available</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-text-muted italic">No PDF attached</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span
                        className={`px-2.5 py-1 inline-flex font-bold rounded-full border ${
                          act.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                            : act.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                        }`}
                      >
                        {act.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/acts/${act.id}/edit`}
                          className="inline-flex items-center px-3 py-1.5 border border-black/5 dark:border-white/5 rounded-lg text-xs font-bold text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Edit
                        </Link>
                        <DeleteActButton id={act.id} title={act.title} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <FileText className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
                    <p className="text-base font-bold text-navy dark:text-white">No acts or laws found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {q || category || status
                        ? 'Try adjusting your search filters.'
                        : 'Click "Add Act / Law" above to create your first document.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
