import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeletePageButton from './DeletePageButton';
import PublishPageButton from './PublishPageButton';

export default async function AdminPagesPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const pages = await prisma.builderPage.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Visual Pages</h1>
          <p className="mt-2 text-text-secondary font-medium">
            Drag &amp; drop page builder — design landing and feature pages like the old WordPress site.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/admin/pages/new"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5"
          >
            Create Page
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Public URL</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Updated</th>
                <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
              {pages.length > 0 ? (
                pages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-navy dark:text-white min-w-[220px]">{page.title}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-text-secondary">
                      {page.status === 'PUBLISHED' ? (
                        <Link href={`/p/${page.slug}`} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                          /p/{page.slug}
                        </Link>
                      ) : (
                        <span className="text-text-muted">/p/{page.slug}</span>
                      )}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${
                          page.status === 'PUBLISHED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {page.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                      {page.updatedAt.toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <PublishPageButton id={page.id} status={page.status} />
                        <Link
                          href={`/admin/pages/${page.id}/edit`}
                          className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                          Edit
                        </Link>
                        <DeletePageButton id={page.id} title={page.title} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-text-muted">
                    No pages yet — create your first drag &amp; drop page.
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
