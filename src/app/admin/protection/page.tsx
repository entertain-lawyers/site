import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { PROTECTION_ACTION_PREFIX, PROTECTION_LABELS, protectionSince, dailyAttemptBuckets } from '@/lib/protection';

export const metadata: Metadata = {
  title: 'Protection Center - Entertain Lawyers Admin',
};

/**
 * "Content Protection Center" — the fuller view behind the dashboard widget:
 * 30-day trend, per-attempt breakdown, most targeted pages, repeat visitor
 * IPs and the raw event stream from AccessLog.
 */
export default async function AdminProtectionPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const since30d = protectionSince(30);

  const [total30d, byAction, topPages, topIps, recent, trend] = await Promise.all([
    prisma.accessLog.count({ where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since30d } } }).catch(() => 0),
    prisma.accessLog.groupBy({
      by: ['action'],
      where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since30d } },
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
    }).catch(() => [] as { action: string; _count: { _all: number } }[]),
    prisma.accessLog.groupBy({
      by: ['url'],
      where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since30d }, url: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { url: 'desc' } },
      take: 8,
    }).catch(() => [] as { url: string | null; _count: { _all: number } }[]),
    prisma.accessLog.groupBy({
      by: ['ipAddress'],
      where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since30d }, ipAddress: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 8,
    }).catch(() => [] as { ipAddress: string | null; _count: { _all: number } }[]),
    prisma.accessLog.findMany({
      where: { action: { startsWith: PROTECTION_ACTION_PREFIX } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }).catch(() => []),
    prisma.accessLog.findMany({
      where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since30d } },
      select: { createdAt: true },
    }).catch(() => [] as { createdAt: Date }[]),
  ]);

  // 30-day daily buckets for the mini bar chart (value = attempts that day).
  const trendBars = dailyAttemptBuckets(trend.map(row => row.createdAt), 30, since30d);
  const trendMax = Math.max(1, ...trendBars.map(([, c]) => c));
  const daysWithAttempts = trendBars.filter(([, c]) => c > 0).length;

  const avgPerDay = daysWithAttempts > 0 ? Math.round(total30d / daysWithAttempts) : 0;
  const repeatIps = topIps.filter(i => i._count._all > 3).length;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Protection Center</h1>
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
              ● Active
            </span>
          </div>
          <p className="mt-2 text-text-secondary font-medium max-w-2xl">
            Copy, cut, right-click, save, print, drag and view-source attempts are blocked automatically across the public site
            and logged here — the same oversight the old WordPress copy-protection plugin provided.
          </p>
        </div>
        <Link
          href="/admin"
          className="flex-shrink-0 px-5 py-2.5 rounded-xl border border-border text-sm font-bold text-text-primary dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Attempts Blocked (30d)</p>
          <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">{total30d}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Active Days</p>
          <p className="text-3xl font-extrabold text-navy dark:text-white">{daysWithAttempts}<span className="text-base font-bold text-text-muted">/30</span></p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Avg / Active Day</p>
          <p className="text-3xl font-extrabold text-navy dark:text-white">{avgPerDay}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Repeat Offender IPs (4+)</p>
          <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{repeatIps}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* 30-day trend */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-6">
          <h2 className="text-base font-bold text-navy dark:text-white mb-4">Daily attempts — last 30 days</h2>
          {trendMax > 1 || total30d > 0 ? (
            <div className="flex items-end gap-[3px] h-28" role="img" aria-label="Daily blocked attempts over the last 30 days">
              {trendBars.map(([day, count]) => (
                <div
                  key={day}
                  title={`${day}: ${count} attempt${count === 1 ? '' : 's'}`}
                  className="flex-1 rounded-t bg-gradient-to-t from-red-500/80 to-orange-400/80 min-h-[2px] hover:from-red-600 hover:to-orange-500 transition-colors"
                  style={{ height: count === 0 ? '2px' : `${Math.max(6, Math.round((count / trendMax) * 100))}%` }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted font-medium py-6 text-center">No attempts recorded in the last 30 days.</p>
          )}
        </div>

        {/* Per-action breakdown */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-6">
          <h2 className="text-base font-bold text-navy dark:text-white mb-4">By attempt type (30d)</h2>
          <div className="space-y-3">
            {byAction.length > 0 ? (
              byAction.map((row) => {
                const max = byAction[0]?._count._all || 1;
                return (
                  <div key={row.action} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-text-secondary dark:text-white/60 flex-1 truncate">{PROTECTION_LABELS[row.action] || row.action}</span>
                    <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max(4, Math.round((row._count._all / max) * 100))}%` }} />
                    </div>
                    <span className="text-sm font-extrabold text-navy dark:text-white tabular-nums w-10 text-right">{row._count._all}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-text-muted font-medium py-4">Nothing blocked yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Most targeted pages */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-6">
          <h2 className="text-base font-bold text-navy dark:text-white mb-4">Most targeted pages</h2>
          {topPages.length > 0 ? (
            <ul className="space-y-2.5">
              {topPages.map((row) => (
                <li key={row.url} className="flex items-center justify-between gap-3 text-sm">
                  <a href={row.url || '#'} target="_blank" rel="noopener noreferrer" className="text-text-secondary dark:text-white/70 hover:text-accent truncate">{row.url}</a>
                  <span className="text-xs font-bold text-text-muted tabular-nums shrink-0">{row._count._all}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted font-medium py-4">No page-level data yet.</p>
          )}
        </div>

        {/* IPs of visitors who tried */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-6">
          <h2 className="text-base font-bold text-navy dark:text-white mb-4">Visitor IPs with blocked attempts</h2>
          {topIps.length > 0 ? (
            <ul className="space-y-2.5">
              {topIps.map((row) => (
                <li key={row.ipAddress || 'unknown'} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono text-text-secondary dark:text-white/70">{row.ipAddress}</span>
                  <span className="text-xs font-bold text-text-muted tabular-nums shrink-0">{row._count._all}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted font-medium py-4">No IP data yet.</p>
          )}
        </div>
      </div>

      {/* Raw event stream */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/50">
          <h3 className="text-lg font-bold text-navy dark:text-white">Recent blocked attempts</h3>
          <p className="text-sm text-text-secondary mt-0.5">Raw event stream — newest first (latest 25).</p>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {recent.length > 0 ? (
            recent.map((log) => (
              <div key={log.id} className="px-8 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                <span className="px-2.5 py-1 inline-flex text-[11px] font-bold rounded-full border bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50">
                  Blocked
                </span>
                <span className="text-sm font-bold text-navy dark:text-white">{PROTECTION_LABELS[log.action] || log.action}</span>
                <span className="text-sm text-text-muted truncate max-w-[260px]">{log.url || '—'}</span>
                {log.ipAddress ? <span className="text-xs font-mono text-text-muted">{log.ipAddress}</span> : null}
                <span className="text-xs font-medium text-text-muted ml-auto">
                  {log.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="px-8 py-12 text-center">
              <p className="text-sm font-bold text-navy dark:text-white mb-1">No blocked attempts yet</p>
              <p className="text-sm text-text-secondary">
                Protection is live on every public page. Try right-clicking or pressing Ctrl+C on the site — the attempt will appear here instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
