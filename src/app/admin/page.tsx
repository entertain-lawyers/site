import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Entertain Lawyers',
};

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const isAdmin = session.user.role === 'ADMIN';

  // Base queries for both ADMIN and EDITOR
  const [postCount, activePostCount] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: 'PUBLISHED' } })
  ]);

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
        include: { user: true },
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

        {/* Site Control quick links */}
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
              <Link href="#" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors">View All &rarr;</Link>
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

      </div>
    </div>
  );
}
