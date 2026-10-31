import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import DeleteResourceButton from './DeleteResourceButton';
import ArchiveResourceButton from './ArchiveResourceButton';
import { ResourceType, Prisma } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Manage Resources - Admin',
};

export default async function AdminResourcesPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const isAdmin = session.user.role === 'ADMIN';

  const whereClause: Prisma.ResourceWhereInput = isAdmin
    ? {}
    : {
        OR: [
          { type: { notIn: [ResourceType.LAW_NOTE, ResourceType.CASE_LAW] } }
        ]
      };

  const resources = await prisma.resource.findMany({
    where: whereClause,
    include: {
      subject: {
        include: {
          semester: true
        }
      },
      document: true
    },
    orderBy: { title: 'asc' }
  });

  return (
    <div className="min-h-screen bg-transparent py-10 max-w-[1400px] mx-auto">
      <div className="px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Manage Resources</h1>
            <p className="mt-2 text-text-secondary font-medium">
              A comprehensive list of all study materials, PDFs, and resources available.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/admin/study/resources/new"
              className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 hover:-translate-y-0.5"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Resource
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
              <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Subject & Semester</th>
                  <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Type / Price</th>
                  <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Document Status</th>
                  <th scope="col" className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
                {resources.length > 0 ? (
                  resources.map((resource) => {
                    const typedResource = resource as any;
                    return (
                      <tr key={resource.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="text-sm font-bold text-navy dark:text-white line-clamp-2 max-w-xs">{resource.title}</div>
                          <div className="text-xs text-text-muted font-mono mt-1" title={resource.id}>ID: {resource.id.split('-')[0]}...</div>
                          {resource.status !== 'PUBLISHED' && (
                            <span className="mt-1.5 inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                              {resource.status === 'ARCHIVED' ? 'Archived' : 'Draft'}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="text-sm font-medium text-navy dark:text-white">{typedResource.subject?.name}</div>
                          <div className="text-xs text-text-secondary mt-0.5">{typedResource.subject?.semester?.name}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border mb-1 ${
                            resource.isPremium
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                          }`}>
                            {resource.isPremium ? 'Premium' : 'Free'}
                          </span>
                          {resource.isPremium && resource.priceAmount && (
                            <div className="text-sm font-bold text-navy dark:text-white mt-1">
                              {resource.currency} {(resource.priceAmount / 100).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          {resource.documentId ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                              <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-slate-400 dark:border-zinc-700">
                              <svg className="h-3 w-3 text-slate-500" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Pending Upload
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/resources/${resource.id}`} className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm">
                            View
                          </Link>
                          <ArchiveResourceButton id={resource.id} archived={resource.status === 'ARCHIVED'} />
                          {(session?.user?.role === 'ADMIN' ) && (
                            <DeleteResourceButton id={resource.id} />
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-navy dark:text-white">No resources found</h3>
                        <p className="text-sm text-text-secondary">Click "Add Resource" to create one.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
