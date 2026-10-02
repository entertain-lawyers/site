import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Dashboard - Entertain Lawyers',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/dashboard');
  }

  const userId = session.user.id;

  let [activeSubscriptions, purchases] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    }),
    prisma.purchase.findMany({
      where: { userId },
      include: {
        resource: {
          include: { subject: true }
        }
      },
      orderBy: { id: 'desc' } // Assuming id sort correlates to recency
    })
  ]);

  if (session.user.role === 'ADMIN') {
    activeSubscriptions = [
      {
        id: 'admin-lifetime-access',
        userId: session.user.id,
        planId: 'lifetime',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2099-12-31T23:59:59.999Z'),
        createdAt: new Date(),
        plan: {
          id: 'lifetime',
          name: 'Premium Lifetime Access (Admin)',
          description: 'Lifetime access to all resources and features.',
          price: 0,
          duration: 999,
          stripePriceId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any
      },
      ...activeSubscriptions
    ];
  }

  return (
    <div className="min-h-screen bg-background py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="bg-surface rounded-2xl shadow-soft border border-border p-5 sm:p-8 mb-8">
          <h1 className="text-fluid-h2 font-bold text-navy dark:text-white mb-2 tracking-tight">My Dashboard</h1>
          <p className="text-text-secondary text-fluid-base truncate">Welcome back, {session.user.email}</p>
        </div>

        {/* Subscriptions Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-fluid-h3 font-bold text-navy dark:text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-accent" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Active Subscriptions
            </h2>
            {activeSubscriptions.length === 0 && (
              <Link href="/pricing" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors min-h-[44px] inline-flex items-center">
                View Plans
              </Link>
            )}
          </div>

          {activeSubscriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSubscriptions.map((sub) => (
                <div key={sub.id} className="group flex flex-col bg-surface rounded-2xl shadow-soft border border-gold/30 hover:border-gold hover:shadow-[0_0_15px_rgba(201,162,39,0.2)] p-6 relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gold/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-navy dark:text-white">{(sub as any).plan?.name}</h3>
                    <span className="px-3 py-1 text-xs font-bold rounded-md bg-green-50 text-green-700 border border-green-200 uppercase tracking-wide">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-text-secondary mb-6 flex-grow">
                    <p>Access to all premium resources</p>
                    <p>
                      <span className="font-semibold text-navy dark:text-white">Expires: </span>
                      {sub.planId === 'lifetime' ? 'Never (Lifetime Access)' : new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href="/study"
                    className="inline-flex w-full justify-center items-center px-4 py-3 min-h-[44px] border border-transparent text-sm font-bold rounded-xl text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
                  >
                    Browse Resources
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-2xl shadow-soft border border-border p-6 sm:p-12 text-center">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-5 text-text-muted">
                <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p className="text-text-secondary mb-6 text-lg">You don't have any active subscriptions.</p>
              <Link
                href="/pricing"
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent hover:bg-accent-hover transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5"
              >
                Subscribe Now
              </Link>
            </div>
          )}
        </section>

        {/* Purchased Resources Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-fluid-h3 font-bold text-navy dark:text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-accent" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Purchased Resources
            </h2>
          </div>

          {purchases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {purchases.map((purchase) => {
                const typedResource = purchase.resource as any;
                return (
                  <Link
                    key={purchase.id}
                    href={`/read/${purchase.resourceId}`}
                    className="group flex flex-col bg-surface rounded-2xl shadow-soft border border-border p-6 hover:border-accent transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 text-xs font-bold rounded-md bg-surface-alt text-text-secondary border border-border mb-3">
                        {typedResource?.subject?.name || 'Unknown Subject'}
                      </span>
                      <h3 className="text-lg font-bold text-navy dark:text-white group-hover:text-accent transition-colors line-clamp-2">
                        {typedResource?.title}
                      </h3>
                    </div>
                    <div className="mt-auto pt-5 border-t border-border flex justify-between items-center group-hover:border-accent/30 transition-colors">
                      <span className="text-sm font-bold text-accent">
                        Read Document
                      </span>
                      <svg className="w-4 h-4 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-surface rounded-2xl shadow-soft border border-border p-6 sm:p-12 text-center">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-5 border border-border">
                <svg className="w-8 h-8 text-text-muted" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy dark:text-white mb-2">No purchased resources</h3>
              <p className="text-text-secondary mb-6 text-base">You haven't purchased any individual resources yet.</p>
              <Link
                href="/study"
                className="inline-flex items-center px-6 py-3 min-h-[44px] border border-border text-sm font-bold rounded-xl text-navy dark:text-white bg-surface-alt hover:bg-border transition-colors"
              >
                Browse Materials
              </Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
