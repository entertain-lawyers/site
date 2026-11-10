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
    <div data-resource-page-shell className="admin-editor-page w-full min-h-screen flex flex-col">
      <div data-resource-form-card className="bg-white dark:bg-zinc-900 shadow-sm border-b border-gray-200 dark:border-white/10 flex-1 flex flex-col">
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
