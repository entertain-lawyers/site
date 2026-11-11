import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import ActsTableClient from './ActsTableClient';
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
      <ActsTableClient
        acts={acts.map((act) => ({
          id: act.id,
          title: act.title,
          titleEn: act.titleEn,
          slug: act.slug,
          category: act.category,
          documentUrl: act.documentUrl,
          status: act.status,
        }))}
      />
    </div>
  );
}
