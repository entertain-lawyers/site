import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { Plus, Edit2, Layers } from 'lucide-react';
import DeleteSemesterButton from './DeleteSemesterButton';

export const metadata: Metadata = {
  title: 'Manage Semesters - Admin - Entertain Lawyers',
};

export default async function AdminSemestersPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { subjects: true },
      },
    },
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Curriculum Semesters</h1>
          <p className="mt-2 text-text-secondary font-medium">
            Manage academic semester structures, display ordering, and URLs.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/admin/study/semesters/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>Add Semester</span>
          </Link>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <tr>
                <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider w-24">
                  Order
                </th>
                <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  Semester Name
                </th>
                <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  Slug
                </th>
                <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                  Subjects
                </th>
                <th scope="col" className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
              {semesters.length > 0 ? (
                semesters.map((semester) => (
                  <tr key={semester.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-navy dark:text-white font-mono font-bold text-xs border border-black/5 dark:border-white/5">
                        {semester.order}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-navy dark:text-white">
                        {semester.name}
                      </div>
                      <div className="text-xs text-text-muted font-mono mt-0.5">
                        ID: {semester.id.split('-')[0]}...
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-text-secondary">
                      {semester.slug ? (
                        <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-navy dark:text-zinc-300">
                          {semester.slug}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted italic">None</span>
                      )}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                        {semester._count.subjects} {semester._count.subjects === 1 ? 'subject' : 'subjects'}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/study/semesters/${semester.id}/edit`}
                        className="inline-flex items-center gap-1.5 justify-center px-3.5 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4 text-text-muted" />
                        <span>Edit</span>
                      </Link>
                      <DeleteSemesterButton id={semester.id} name={semester.name} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                        <Layers className="w-8 h-8 text-text-muted" />
                      </div>
                      <h3 className="text-lg font-bold text-navy dark:text-white">No semesters found</h3>
                      <p className="text-sm text-text-secondary">Get started by creating your first academic semester.</p>
                      <Link
                        href="/admin/study/semesters/new"
                        className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent/90 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Semester
                      </Link>
                    </div>
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
