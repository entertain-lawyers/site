import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { ResourceType } from '@prisma/client';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import { listLocalAuthorsWithStatus } from '@/lib/content-authors';
import { getWordPressWriteBlock } from '@/lib/wordpress';

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const { id } = await params;

  let resource: {
    id: string;
    title: string;
    content: string | null;
    metaDesc: string | null;
    semesterId: string | null;
    subjectId: string | null;
    unitId: string | null;
    type: ResourceType;
    isPremium: boolean;
    priceAmount: number | null;
    status: import('@prisma/client').ContentStatus;
    authorId?: string | null;
    featuredImage?: string | null;
    featuredImageId?: number | null;
    document?: { id: string } | null;
    subject?: { semesterId: string | null } | null;
  } | null = null;

  try {
    resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        document: { select: { id: true } },
        subject: { select: { semesterId: true } },
      },
    });
  } catch (resourceError) {
    const { isSpecificMissingColumnError } = await import('@/lib/prisma-errors');
    if (!isSpecificMissingColumnError(resourceError, ['authorId', 'createdById'])) {
      console.error(`[admin/study/resources/${id}/edit] database error loading resource:`, resourceError);
      throw resourceError;
    }

    console.warn(
      `[admin/study/resources/${id}/edit] resource findUnique failed (authorId/createdById migration pending), falling back to base fields:`,
      resourceError
    );
    resource = await prisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        metaDesc: true,
        semesterId: true,
        subjectId: true,
        unitId: true,
        type: true,
        isPremium: true,
        priceAmount: true,
        status: true,
        document: { select: { id: true } },
        subject: { select: { semesterId: true } },
      },
    });
  }

  const [semesters, subjects, units, { authors, authorMappingAvailable }] = await Promise.all([
    prisma.semester.findMany({ orderBy: { order: 'asc' } }),
    prisma.subject.findMany({ include: { semester: true }, orderBy: { name: 'asc' } }),
    prisma.unit.findMany({ orderBy: { order: 'asc' } }),
    listLocalAuthorsWithStatus(),
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
    <div data-resource-page-shell className="admin-editor-page w-full min-h-screen flex flex-col">
      <div data-resource-form-card className="bg-white dark:bg-zinc-900 shadow-sm border-b border-gray-200 dark:border-white/10 flex-1 flex flex-col">
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
          authorMappingAvailable={authorMappingAvailable}
          defaultAuthorId={session.user.id}
          uploadBlockedReason={getWordPressWriteBlock('en')}
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
            authorId: resource.authorId ?? null,
            hasDocument: Boolean(resource.document),
            featuredImage: resource.featuredImage ?? null,
            featuredImageId: resource.featuredImageId ?? null,
          }}
        />
      </div>
    </div>
  );
}
