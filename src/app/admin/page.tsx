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
    prisma.post.count({ where: { isPublished: true } })
  ]);

  // Admin-specific queries
  let resourceCount = 0;
  let userCount = 0;
  let activeSubCount = 0;
  let totalRevenue = 0;
  let recentTransactions: any[] = [];

  if (isAdmin) {
    const [
      rc,
      uc,
      asc,
      completedTx,
      recentTx
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
      })
    ]);
    resourceCount = rc;
    userCount = uc;
    activeSubCount = asc;
    totalRevenue = completedTx._sum.amount ? completedTx._sum.amount / 100 : 0;
    recentTransactions = recentTx;
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-fluid-h2 font-bold text-navy dark:text-white mb-2">Admin Dashboard</h1>
            <p className="text-text-secondary text-fluid-base">Platform overview and recent activity</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/admin/resources"
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md text-text-primary bg-surface hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
            >
              View All Resources
            </Link>
            <Link 
              href="/admin/resources/new"
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-navy hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Resource
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Post Stats (Available to both) */}
          <div className="bg-surface rounded-xl shadow-soft border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500/10 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-muted truncate">Total Posts</dt>
                  <dd className="text-2xl font-bold text-navy dark:text-white">{postCount}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl shadow-soft border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500/10 rounded-md p-3">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-muted truncate">Published Posts</dt>
                  <dd className="text-2xl font-bold text-navy dark:text-white">{activePostCount}</dd>
                </dl>
              </div>
            </div>
          </div>

          {isAdmin && (
            <>
              <div className="bg-surface rounded-xl shadow-soft border border-border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">Total Resources</dt>
                      <dd className="text-2xl font-bold text-navy dark:text-white">{resourceCount}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl shadow-soft border border-border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">Total Users</dt>
                      <dd className="text-2xl font-bold text-navy dark:text-white">{userCount}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl shadow-soft border border-border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900/30 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">Active Subscriptions</dt>
                      <dd className="text-2xl font-bold text-navy dark:text-white">{activeSubCount}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl shadow-soft border border-border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/30 rounded-md p-3">
                    <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">Total Revenue</dt>
                      <dd className="text-2xl font-bold text-navy dark:text-white">NPR {totalRevenue.toFixed(2)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Transactions Table */}
        {isAdmin && (
          <div className="bg-surface rounded-xl shadow-soft border border-border overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg leading-6 font-medium text-navy dark:text-white">Recent Completed Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-alt">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Provider</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy dark:text-white">
                          {tx.user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tx.type === 'SUBSCRIPTION' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {tx.provider}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-navy dark:text-white font-medium">
                          {tx.currency} {(tx.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {tx.createdAt.toLocaleDateString()} {tx.createdAt.toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-muted">
                        No recent transactions found.
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
