import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ResourceType } from '@prisma/client';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import { listLocalAuthorsWithStatus } from '@/lib/content-authors';
import { getWordPressWriteBlock } from '@/lib/wordpress';

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'EDITOR') {
    redirect('/');
  }

  const { type } = await searchParams;
  const isCaseLaw = type === ResourceType.CASE_LAW;

  if (isCaseLaw && session.user.role !== 'ADMIN') {
    redirect('/admin/study/resources');
  }

  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' }
  });

  const subjects = await prisma.subject.findMany({
    include: { semester: true },
    orderBy: { name: 'asc' }
  });

  const units = await prisma.unit.findMany({
    orderBy: { order: 'asc' },
  });

  const { authors, authorMappingAvailable } = await listLocalAuthorsWithStatus();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {isCaseLaw ? 'Add New Case Law' : 'Add New Resource'}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-zinc-400">
          {isCaseLaw
            ? 'Create a landmark judgment or case law summary with precedent citations.'
            : 'Create a new resource and upload its PDF document or write note details.'}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-6 sm:p-10">
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects}
          units={units}
          canManageLawTypes={session.user.role === 'ADMIN'}
          authors={authors}
          authorMappingAvailable={authorMappingAvailable}
          defaultAuthorId={session.user.id}
          initialType={isCaseLaw ? ResourceType.CASE_LAW : undefined}
          uploadBlockedReason={getWordPressWriteBlock('en')}
        />
      </div>
    </div>
  );
}
