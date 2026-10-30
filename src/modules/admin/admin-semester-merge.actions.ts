'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { SEMESTERS_CACHE_TAG } from '@/lib/cache-tags';

const previewSemesterMergeSchema = z.object({
  sourceId: z.string().uuid('Invalid source semester ID'),
  targetId: z.string().uuid('Invalid target semester ID'),
});

const mergeSemestersSchema = z.object({
  sourceId: z.string().uuid('Invalid source semester ID'),
  targetId: z.string().uuid('Invalid target semester ID'),
  confirmationPhrase: z.string(),
  removeEmptyTestSubjects: z.boolean().default(true),
  deleteSourceSemester: z.boolean().default(true),
});

export const previewSemesterMergeAction = createSafeAction(
  async (args: z.infer<typeof previewSemesterMergeSchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized: Admin or Editor access required');
    }

    const { sourceId, targetId } = previewSemesterMergeSchema.parse(args);

    if (sourceId === targetId) {
      throw new Error('Source and target semester must be different');
    }

    const [source, target] = await Promise.all([
      prisma.semester.findUnique({
        where: { id: sourceId },
        include: {
          subjects: {
            include: {
              units: { select: { id: true } },
              resources: { select: { id: true, type: true } },
            },
          },
          resources: { select: { id: true, type: true } },
        },
      }),
      prisma.semester.findUnique({
        where: { id: targetId },
        include: {
          subjects: {
            include: {
              units: { select: { id: true } },
              resources: { select: { id: true, type: true } },
            },
          },
          resources: { select: { id: true, type: true } },
        },
      }),
    ]);

    if (!source) throw new Error('Source semester not found');
    if (!target) throw new Error('Target semester not found');

    const targetSubjectNames = new Set(target.subjects.map((s) => s.name.toLowerCase().trim()));
    const targetSubjectSlugs = new Set(
      target.subjects.map((s) => s.slug?.toLowerCase().trim()).filter(Boolean) as string[]
    );

    let totalSourceIndirectResources = 0;
    const indirectResourcesByType: Record<string, number> = {};

    const subjectsSummary = source.subjects.map((sub) => {
      const unitCount = sub.units.length;
      const resourceCount = sub.resources.length;
      totalSourceIndirectResources += resourceCount;

      for (const r of sub.resources) {
        indirectResourcesByType[r.type] = (indirectResourcesByType[r.type] || 0) + 1;
      }

      const nameConflict = targetSubjectNames.has(sub.name.toLowerCase().trim());
      const slugConflict = sub.slug ? targetSubjectSlugs.has(sub.slug.toLowerCase().trim()) : false;
      const isEmpty = unitCount === 0 && resourceCount === 0;

      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        order: sub.order,
        unitCount,
        resourceCount,
        isEmpty,
        hasNameConflict: nameConflict,
        hasSlugConflict: slugConflict,
      };
    });

    const directResourcesByType: Record<string, number> = {};
    for (const r of source.resources) {
      directResourcesByType[r.type] = (directResourcesByType[r.type] || 0) + 1;
    }

    const totalUnits = subjectsSummary.reduce((acc, s) => acc + s.unitCount, 0);

    return {
      source: {
        id: source.id,
        name: source.name,
        slug: source.slug,
        order: source.order,
        subjectCount: source.subjects.length,
        unitCount: totalUnits,
        directResourceCount: source.resources.length,
        directResourcesByType,
        indirectResourceCount: totalSourceIndirectResources,
        indirectResourcesByType,
        subjects: subjectsSummary,
      },
      target: {
        id: target.id,
        name: target.name,
        slug: target.slug,
        order: target.order,
        subjectCount: target.subjects.length,
        directResourceCount: target.resources.length,
      },
    };
  }
);

export const mergeSemestersAction = createSafeAction(
  async (args: z.infer<typeof mergeSemestersSchema>, session) => {
    if (session.role !== Role.ADMIN) {
      throw new Error('Unauthorized: Admin access required for semester consolidation');
    }

    const input = mergeSemestersSchema.parse(args);

    if (input.confirmationPhrase.trim().toUpperCase() !== 'CONFIRM') {
      throw new Error('Please type "CONFIRM" to authorize this operation.');
    }

    if (input.sourceId === input.targetId) {
      throw new Error('Source and target semester must be different');
    }

    return await prisma.$transaction(async (tx) => {
      const source = await tx.semester.findUnique({
        where: { id: input.sourceId },
        include: {
          subjects: {
            include: {
              units: { select: { id: true } },
              resources: { select: { id: true } },
            },
          },
          resources: { select: { id: true } },
        },
      });

      const target = await tx.semester.findUnique({
        where: { id: input.targetId },
        include: {
          subjects: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!source) throw new Error('Source semester not found');
      if (!target) throw new Error('Target semester not found');

      // 1. Move direct resources (Resource.semesterId)
      let movedDirectResources = 0;
      if (source.resources.length > 0) {
        const updateRes = await tx.resource.updateMany({
          where: { semesterId: input.sourceId },
          data: { semesterId: input.targetId },
        });
        movedDirectResources = updateRes.count;
      }

      // 2. Handle child subjects
      let deletedEmptySubjectsCount = 0;
      let reassignedSubjectsCount = 0;
      const targetSlugs = new Set(
        target.subjects.map((s) => s.slug?.toLowerCase().trim()).filter(Boolean) as string[]
      );

      for (const sub of source.subjects) {
        const isEmpty = sub.units.length === 0 && sub.resources.length === 0;

        if (input.removeEmptyTestSubjects && isEmpty) {
          // Safe removal of empty orphan/test subject (like "Sub1")
          await tx.subject.delete({ where: { id: sub.id } });
          deletedEmptySubjectsCount++;
        } else {
          // Reassign subject to target semester
          let newSlug = sub.slug;
          if (newSlug && targetSlugs.has(newSlug.toLowerCase().trim())) {
            newSlug = `${newSlug}-merged-${Date.now().toString(36)}`;
          }

          await tx.subject.update({
            where: { id: sub.id },
            data: {
              semesterId: input.targetId,
              slug: newSlug,
            },
          });
          reassignedSubjectsCount++;
          if (newSlug) targetSlugs.add(newSlug.toLowerCase().trim());
        }
      }

      // 3. Verify source is now empty of children
      const remainingSubjects = await tx.subject.count({ where: { semesterId: input.sourceId } });
      const remainingDirectResources = await tx.resource.count({ where: { semesterId: input.sourceId } });

      if (remainingSubjects > 0 || remainingDirectResources > 0) {
        throw new Error(
          `Cannot delete source semester: ${remainingSubjects} subjects and ${remainingDirectResources} resources remain attached.`
        );
      }

      // 4. Delete source semester if requested
      if (input.deleteSourceSemester) {
        await tx.semester.delete({ where: { id: input.sourceId } });
      }

      // 5. Audit Log
      if (session.userId) {
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: 'DELETE',
            entityType: 'SEMESTER',
            entityId: source.id,
            details: {
              sourceName: source.name,
              sourceId: source.id,
              targetName: target.name,
              targetId: target.id,
              movedDirectResources,
              deletedEmptySubjectsCount,
              reassignedSubjectsCount,
            },
          },
        });
      }

      // 6. Revalidate cache
      revalidatePath('/admin/study/semesters');
      revalidatePath('/admin/study/subjects');
      revalidatePath('/study');
      revalidatePath('/semesters');
      revalidateTag(SEMESTERS_CACHE_TAG, { expire: 0 });

      return {
        success: true,
        sourceName: source.name,
        targetName: target.name,
        movedDirectResources,
        deletedEmptySubjectsCount,
        reassignedSubjectsCount,
      };
    });
  }
);
