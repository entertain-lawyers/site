import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import RedirectsClient from './RedirectsClient';

export const metadata = { title: 'Redirects | Admin' };

export default async function AdminRedirectsPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect('/admin');
  }

  const rows = await prisma.redirect.findMany({ orderBy: { source: 'asc' } });

  const redirects = rows.map((row) => ({
    id: row.id,
    source: row.source,
    destination: row.destination,
    statusCode: row.statusCode,
    isActive: row.isActive,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent mb-3">
            Site Control
          </div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Redirects</h1>
          <p className="mt-2 text-text-secondary font-medium max-w-3xl">
            Send old or changed URLs to the right page. Active rules are checked automatically when a visitor
            hits a path that no longer exists. Changes take effect within about 10 seconds.
          </p>
        </div>
        <div className="flex gap-3 text-sm font-bold">
          <span className="rounded-full border border-black/5 bg-white px-4 py-2 text-navy shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-white">
            {redirects.length} total
          </span>
          <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-green-700">
            {redirects.filter((row) => row.isActive).length} active
          </span>
        </div>
      </div>

      <RedirectsClient initialRedirects={redirects} />
    </div>
  );
}
