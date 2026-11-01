import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ResourceType } from '@prisma/client';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import { listLocalAuthors } from '@/lib/content-authors';

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { id } = await params;

  const [resource, semesters, subjects, units, authors] = await Promise.all([
    prisma.resource.findUnique({
      where: { id },
      include: {
        document: { select: { id: true } },
        subject: { select: { semesterId: true } },
      },
    }),
    prisma.semester.findMany({ orderBy: { order: 'asc' } }),
    prisma.subject.findMany({ include: { semester: true }, orderBy: { name: 'asc' } }),
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
    listLocalAuthors(),
  ]);

  if (!resource) notFound();

  // Mirror the resource list: editors cannot maintain law notes or case laws.
  if (
    session.user.role === 'EDITOR' &&
    (resource.type === ResourceType.LAW_NOTE || resource.type === ResourceType.CASE_LAW)
  ) {
    redirect('/admin/study/resources');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Edit Resource</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Update the resource details and who it is credited to.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-6 sm:p-10">
        <AdminResourceForm
          semesters={semesters}
          subjects={subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            semesterId: subject.semesterId,
          }))}
          units={units.map((unit) => ({ id: unit.id, name: unit.name, subjectId: unit.subjectId }))}
          canManageLawTypes={session.user.role === 'ADMIN'}
          authors={authors}
          defaultAuthorId={session.user.id}
          resource={{
            id: resource.id,
            title: resource.title,
            content: resource.content,
            description: resource.metaDesc,
            semesterId: resource.semesterId ?? resource.subject?.semesterId ?? null,
            subjectId: resource.subjectId,
            unitId: resource.unitId,
            type: resource.type,
            isPremium: resource.isPremium,
            priceAmount: resource.priceAmount,
            status: resource.status,
            authorId: resource.authorId,
            hasDocument: Boolean(resource.document),
          }}
        />
      </div>
    </div>
  );
}
