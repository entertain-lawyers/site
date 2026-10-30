import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { PROTECTION_ACTION_PREFIX, PROTECTION_LABELS, protectionSince } from '@/lib/protection';
import { PAGE_VIEW_ACTION, resolvePostTitles, friendlyPageLabel } from '@/lib/analytics';
import { getWordPressPosts } from '@/lib/wordpress';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const isAdmin = session.user.role === 'ADMIN';

  // Posts live in the two WordPress installs, not the local Post mirror, so
  // count them at the source (the fetch is cached like every WP list call).
  const wpCount = (lang: 'en' | 'ne', status?: 'publish') =>
    getWordPressPosts({ lang, perPage: 1, fields: 'id', status }).catch(() => null);
  const [wpEn, wpNe, wpEnPublished, wpNePublished, pendingConsultations, upcomingEvents, publishedPages, consultationLawyerCount] = await Promise.all([
    wpCount('en'),
    wpCount('ne'),
    wpCount('en', 'publish'),
    wpCount('ne', 'publish'),
    prisma.consultationRequest.count({ where: { status: 'NEW' } }).catch(() => 0),
    prisma.event.count({ where: { eventDate: { gte: new Date() } } }).catch(() => 0),
    prisma.builderPage.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    prisma.consultationLawyer.count().catch(() => 0),
  ]);
  const postCount = (wpEn?.total ?? 0) + (wpNe?.total ?? 0);
  const activePostCount = (wpEnPublished?.total ?? 0) + (wpNePublished?.total ?? 0);

  // ADMIN: recent platform activity for the activity feed
  let recentActivity: { id: string; action: string; entityType: string; entityId: string; createdAt: Date; userName: string | null }[] = [];
  if (isAdmin) {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { User: { select: { name: true, email: true } } },
    }).catch(() => []);
    recentActivity = logs.map(l => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: l.createdAt,
      userName: l.User?.name || l.User?.email || 'System',
    }));
  }

  // ADMIN: content protection activity (blocked copy/right-click attempts etc.)
  // — mirrors the "Copy Protection" dashboard widget on the old WP site.
  const since7d = protectionSince(7);
  let protection7d = 0;
  let protectionByAction: { action: string; count: number }[] = [];
  let protectionTopPages: { url: string; count: number }[] = [];
  if (isAdmin) {
    const [total, byAction, topPages] = await Promise.all([
      prisma.accessLog.count({ where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since7d } } }).catch(() => 0),
      prisma.accessLog.groupBy({
        by: ['action'],
        where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since7d } },
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 4,
      }).catch(() => [] as { action: string; _count: { _all: number } }[]),
      prisma.accessLog.groupBy({
        by: ['url'],
        where: { action: { startsWith: PROTECTION_ACTION_PREFIX }, createdAt: { gte: since7d }, url: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { url: 'desc' } },
        take: 3,
      }).catch(() => [] as { url: string | null; _count: { _all: number } }[]),
    ]);
    protection7d = total;
    protectionByAction = byAction.map(g => ({ action: g.action, count: g._count._all }));
    protectionTopPages = topPages.map(g => ({ url: g.url || '', count: g._count._all }));
  }

  // First-party site traffic for BOTH roles — page views recorded by
  // AnalyticsTracker (AccessLog PAGE_VIEW rows), 30-day window.
  const since30dViews = protectionSince(30);
  const [viewTotal30d, viewUniques, viewTopPages] = await Promise.all([
    prisma.accessLog.count({ where: { action: PAGE_VIEW_ACTION, createdAt: { gte: since30dViews } } }).catch(() => 0),
    prisma.accessLog.groupBy({
      by: ['ipAddress'],
      where: { action: PAGE_VIEW_ACTION, createdAt: { gte: since30dViews } },
      orderBy: { ipAddress: 'asc' },
      take: 10000,
    }).catch(() => [] as { ipAddress: string | null }[]),
    prisma.accessLog.groupBy({
      by: ['url'],
      where: { action: PAGE_VIEW_ACTION, createdAt: { gte: since30dViews }, url: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { url: 'desc' } },
      take: 10,
    }).catch(() => [] as { url: string | null; _count: { _all: number } }[]),
  ]);
  const topViewPages = viewTopPages.map(g => ({ url: g.url || '', count: g._count._all }));
  // Split the top list into real posts (with WP titles) and other pages, and
  // take the strongest few of each for the widget.
  const { posts: topPosts, plainPages: topPlainPages } = await resolvePostTitles(topViewPages).catch(() => ({ posts: [], plainPages: topViewPages }));
  const widgetPosts = topPosts.slice(0, 4);
  const widgetPages = topPlainPages.slice(0, 4);

  // Admin-specific queries
  let resourceCount = 0;
  let userCount = 0;
  let activeSubCount = 0;
  let totalRevenue = 0;
  let recentTransactions: any[] = [];
  let redirectCount = 0;

  if (isAdmin) {
    const [
      rc,
      uc,
      asc,
      completedTx,
      recentTx,
      redirects
    ] = await Promise.all([
      prisma.resource.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } } }),
      prisma.paymentTransaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.paymentTransaction.findMany({
        where: { status: 'COMPLETED' },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.redirect.count()
    ]);
    resourceCount = rc;
    userCount = uc;
    activeSubCount = asc;
    totalRevenue = completedTx._sum.amount ? completedTx._sum.amount / 100 : 0;
    recentTransactions = recentTx;
    redirectCount = redirects;
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="relative overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/10 p-5 sm:p-8 lg:p-10 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 blur-[80px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>

          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-navy to-accent dark:from-white dark:to-white/70 tracking-tight mb-3">
              Admin Dashboard
            </h1>
            <p className="text-text-secondary text-lg font-medium">Platform overview and real-time activity</p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-4">
            <Link
              href="/admin/study/resources"
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 border border-border shadow-sm text-sm font-bold rounded-xl text-text-primary bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              View All Resources
            </Link>
            <Link
              href="/admin/study/resources/new"
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] hover:shadow-[0_6px_20px_rgba(var(--color-accent),0.23)] hover:bg-accent/90 text-sm font-bold rounded-xl text-white bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 hover:-translate-y-0.5"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Resource
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">

          {/* Post Stats (Available to both) */}
          <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-5 relative z-10">
              <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4 text-blue-600 dark:text-blue-400  group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Total Posts</dt>
                <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{postCount}</dd>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-5 relative z-10">
              <div className="flex-shrink-0 bg-green-50 dark:bg-green-900/30 rounded-2xl p-4 text-green-600 dark:text-green-400  group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Published</dt>
                <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{activePostCount}</dd>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-5 relative z-10">
              <div className={`flex-shrink-0 rounded-2xl p-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${pendingConsultations > 0 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Pending Consultations</dt>
                <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{pendingConsultations}</dd>
              </div>
            </div>
            <Link href="/admin/consultations" className="absolute inset-0" aria-label="Open consultations" />
          </div>

          <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-5 relative z-10">
              <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-900/30 rounded-2xl p-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Consult Lawyers</dt>
                <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{consultationLawyerCount}</dd>
              </div>
            </div>
            <Link href="/admin/lawyers" className="absolute inset-0" aria-label="Open consultation lawyers" />
          </div>

          <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-5 relative z-10">
              <div className="flex-shrink-0 bg-teal-50 dark:bg-teal-900/30 rounded-2xl p-4 text-teal-600 dark:text-teal-400  group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Upcoming Events</dt>
                <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{upcomingEvents}</dd>
              </div>
            </div>
            <Link href="/admin/events" className="absolute inset-0" aria-label="Open events" />
          </div>

            <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
              <div className="flex items-center gap-5 relative z-10">
                <div className="flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-4 text-indigo-600 dark:text-indigo-400  group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                </div>
                <div>
                  <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Visual Pages (Live)</dt>
                  <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{publishedPages}</dd>
                </div>
              </div>
              <Link href="/admin/pages" className="absolute inset-0" aria-label="Open visual pages" />
            </div>

          {isAdmin && (
            <>

              <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="flex-shrink-0 bg-accent/10 rounded-2xl p-4 text-accent  group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Resources</dt>
                    <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{resourceCount}</dd>
                  </div>
                </div>
              </div>

              <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="flex-shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-2xl p-4 text-orange-500  group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Users</dt>
                    <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{userCount}</dd>
                  </div>
                </div>
              </div>

              <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="flex-shrink-0 bg-purple-50 dark:bg-purple-900/30 rounded-2xl p-4 text-purple-600 dark:text-purple-400  group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <dt className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Active Subs</dt>
                    <dd className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">{activeSubCount}</dd>
                  </div>
                </div>
              </div>

              <div className="group bg-navy dark:bg-zinc-900 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/10 relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="flex-shrink-0 bg-white/10 rounded-2xl p-4 text-white  group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <dt className="text-sm font-bold text-white/70 uppercase tracking-wider mb-1">Total Revenue</dt>
                    <dd className="text-3xl font-extrabold text-white tracking-tight">NPR {totalRevenue.toFixed(2)}</dd>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Site Control quick links (merged from upstream site-control PR) */}
        {isAdmin && (
          <div className="mb-10 rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy dark:text-white">Site Control</h2>
                <p className="mt-1 text-sm font-medium text-text-secondary">
                  Change public content, contact details and old-link redirects.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-black/5 bg-slate-50 px-4 py-2 text-xs font-bold text-text-secondary dark:border-white/10 dark:bg-zinc-800 dark:text-white">
                {redirectCount} redirect{redirectCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/admin/settings"
                className="group rounded-xl border border-black/5 p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md dark:border-white/10"
              >
                <p className="text-sm font-bold text-navy dark:text-white">Site Settings</p>
                <p className="mt-1 text-xs font-medium text-text-secondary">Organisation, contact and social links</p>
                <span className="mt-3 inline-block text-xs font-bold text-accent">Open &rarr;</span>
              </Link>
              <Link
                href="/admin/homepage"
                className="group rounded-xl border border-black/5 p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md dark:border-white/10"
              >
                <p className="text-sm font-bold text-navy dark:text-white">Homepage</p>
                <p className="mt-1 text-xs font-medium text-text-secondary">Hero copy, call-to-action and banner</p>
                <span className="mt-3 inline-block text-xs font-bold text-accent">Open &rarr;</span>
              </Link>
              <Link
                href="/admin/redirects"
                className="group rounded-xl border border-black/5 p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md dark:border-white/10"
              >
                <p className="text-sm font-bold text-navy dark:text-white">Redirects</p>
                <p className="mt-1 text-xs font-medium text-text-secondary">Send old URLs to the right page</p>
                <span className="mt-3 inline-block text-xs font-bold text-accent">Open &rarr;</span>
              </Link>
            </div>
          </div>
        )}

        {/* Recent Transactions Table */}
        {isAdmin && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-navy dark:text-white">Recent Transactions</h3>
              <Link href="/admin/audit-logs" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors">Activity log &rarr;</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
                <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
                  <tr>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">User</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Provider</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-navy dark:text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-blue-400 text-white flex items-center justify-center font-bold shadow-sm">
                              {tx.user.email.charAt(0).toUpperCase()}
                            </div>
                            {tx.user.email}
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm">
                          <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${
                            tx.type === 'SUBSCRIPTION'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                          {tx.provider === 'ESEWA' ? (
                            <span className="text-green-600 dark:text-green-400 font-bold">eSewa</span>
                          ) : tx.provider === 'KHALTI' ? (
                            <span className="text-purple-600 dark:text-purple-400 font-bold">Khalti</span>
                          ) : tx.provider}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm text-navy dark:text-white font-bold">
                          {tx.currency} {(tx.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm text-text-secondary">
                          {tx.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center text-sm text-text-muted font-medium">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-12 h-12 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p>No recent transactions found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Site Traffic — first-party analytics, both roles */}
        <div className="mt-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-lg font-bold text-navy dark:text-white">Site Traffic</h3>
              <p className="text-sm text-text-secondary mt-0.5">First-party page views from your own site — last 30 days.</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-2xl font-extrabold text-navy dark:text-white leading-none">{viewTotal30d}</p>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-1">Page Views</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-navy dark:text-white leading-none">{viewUniques.length}</p>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-1">Visitors</p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6 grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Top Articles</p>
              {widgetPosts.length > 0 ? (
                <ul className="space-y-2.5">
                  {widgetPosts.map((row, i) => (
                    <li key={row.url} className="flex items-start gap-3 text-sm">
                      <span className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-accent/10 text-accent text-[11px] font-extrabold flex items-center justify-center">{i + 1}</span>
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-text-primary dark:text-white/80 hover:text-accent font-medium leading-snug line-clamp-2">{row.title}</a>
                      <span className="text-xs font-bold text-text-muted tabular-nums shrink-0 ml-auto mt-0.5">{row.count}×</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted font-medium py-3">No article reads yet — publish articles and visits will appear here.</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Other Popular Pages</p>
              {widgetPages.length > 0 ? (
                <ul className="space-y-2.5">
                  {widgetPages.map((row) => (
                    <li key={row.url} className="flex items-center gap-3 text-sm">
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-text-secondary dark:text-white/70 hover:text-accent truncate">{friendlyPageLabel(row.url)}</a>
                      <span className="text-xs font-bold text-text-muted tabular-nums shrink-0 ml-auto">{row.count}×</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted font-medium py-3">No page views recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity — what has been happening on the platform (ADMIN) */}
        {isAdmin && (
          <div className="mt-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-navy dark:text-white">Recent Activity</h3>
              <Link href="/admin/audit-logs" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors">View All &rarr;</Link>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="px-8 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <span className="px-2.5 py-0.5 inline-flex text-[11px] font-bold rounded-full border bg-slate-50 text-text-secondary border-black/5 dark:bg-zinc-800 dark:border-white/10 dark:text-slate-300">
                      {entry.action}
                    </span>
                    <span className="text-sm font-bold text-navy dark:text-white">{entry.entityType.replace('_', ' ')}</span>
                    <span className="text-sm text-text-muted truncate max-w-[220px]">{entry.entityId}</span>
                    <span className="text-xs font-medium text-text-muted ml-auto">{entry.userName}</span>
                    <span className="text-xs text-text-muted w-24 text-right">{entry.createdAt.toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="px-8 py-12 text-center text-sm text-text-muted font-medium">
                  No recorded activity yet — actions taken across the panel will appear here.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Protection Activity — WP Copy-Protection widget parity (ADMIN) */}
        {isAdmin && (
          <div className="mt-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-navy dark:text-white">Content Protection Activity</h3>
                <p className="text-sm text-text-secondary mt-0.5">Blocked copy, right-click &amp; download attempts on the public site — last 7 days.</p>
              </div>
              <Link href="/admin/protection" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors">Protection Center &rarr;</Link>
            </div>
            <div className="px-8 py-6 grid gap-6 sm:grid-cols-[auto_1fr] items-start">
              <div className="text-center px-6 py-5 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/20 border border-red-100 dark:border-red-900/40 min-w-[150px]">
                <dd className="text-4xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">{protection7d}</dd>
                <dt className="mt-1 text-[11px] font-bold text-red-700/70 dark:text-red-400/70 uppercase tracking-wider">Attempts<br />Blocked (7d)</dt>
              </div>
              <div className="min-w-0 space-y-3">
                {protectionByAction.length > 0 ? (
                  protectionByAction.map((row) => {
                    const max = protectionByAction[0]?.count || 1;
                    return (
                      <div key={row.action} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-text-secondary dark:text-white/60 w-40 shrink-0 truncate">{PROTECTION_LABELS[row.action] || row.action}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden min-w-[60px]">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${Math.max(4, Math.round((row.count / max) * 100))}%` }} />
                        </div>
                        <span className="text-sm font-extrabold text-navy dark:text-white tabular-nums w-10 text-right">{row.count}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-text-muted font-medium py-3">
                    No blocked attempts recorded yet. When visitors try to copy content, right-click, or print on the public site, the attempts appear here.
                  </p>
                )}
                {protectionTopPages.length > 0 ? (
                  <div className="pt-2 border-t border-black/5 dark:border-white/5">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Most targeted pages</p>
                    <ul className="space-y-1.5">
                      {protectionTopPages.map((row) => (
                        <li key={row.url} className="flex items-center justify-between gap-3 text-sm">
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-text-secondary dark:text-white/70 hover:text-accent truncate max-w-[320px]">{row.url}</a>
                          <span className="text-xs font-bold text-text-muted tabular-nums">{row.count}×</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
