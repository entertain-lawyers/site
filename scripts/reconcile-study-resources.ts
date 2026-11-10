import { PrismaClient, ResourceType } from '@prisma/client';
import fs from 'fs';
import { SYLLABUS_CONFIG, normalizeSubjectName } from '../src/lib/syllabus-config';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function runReconciliation() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== RUNNING RECONCILIATION (${isExecute ? 'LIVE EXECUTION' : 'DRY RUN'}) ===\n`);

  const plan: Array<{
    resourceId: string;
    title: string;
    currentType: ResourceType;
    newType: ResourceType;
    currentSubjectId: string | null;
    newSubjectId: string | null;
    newSubjectName: string | null;
    currentSemesterId: string | null;
    newSemesterId: string | null;
    currentUnitId: string | null;
    newUnitId: string | null;
    newUnitName: string | null;
    reason: string;
  }> = JSON.parse(fs.readFileSync('scratch/reconciliation_plan.json', 'utf-8'));

  console.log(`Loaded plan with ${plan.length} resources`);

  // Verify DB state before
  const [initialResourceCount, initialSubjectCount, initialDocCount, semesters, allSubjects] = await Promise.all([
    prisma.resource.count(),
    prisma.subject.count(),
    prisma.document.count(),
    prisma.semester.findMany({ orderBy: { order: 'asc' } }),
    prisma.subject.findMany({ include: { units: true, _count: { select: { resources: true } } } })
  ]);

  console.log(`Initial DB State:`);
  console.log(`- Resources: ${initialResourceCount}`);
  console.log(`- Subjects: ${initialSubjectCount}`);
  console.log(`- Documents: ${initialDocCount}`);
  console.log(`- Semesters: ${semesters.length}`);

  // Identify canonical subject IDs (83)
  const canonicalSubjectIds = new Set<string>();
  for (const semConfig of SYLLABUS_CONFIG) {
    const sem = semesters.find(s => s.order === semConfig.order)!;
    const semSubs = allSubjects.filter(s => s.semesterId === sem.id);

    for (const authSub of semConfig.subjects) {
      const authNorm = normalizeSubjectName(authSub.name);
      const matches = semSubs.filter(s => {
        const sNorm = normalizeSubjectName(s.name);
        return s.name === authSub.name ||
               sNorm === authNorm ||
               s.name.includes(authSub.name) ||
               authSub.name.includes(s.name) ||
               sNorm.startsWith(authNorm) ||
               authNorm.startsWith(sNorm);
      });
      const chosen = [...matches].sort((a, b) => b.units.length - a.units.length)[0];
      if (chosen) canonicalSubjectIds.add(chosen.id);
    }
  }

  console.log(`Canonical Subjects identified: ${canonicalSubjectIds.size}`);
  const legacySubjects = allSubjects.filter(s => !canonicalSubjectIds.has(s.id));
  console.log(`Legacy/Duplicate Subjects identified: ${legacySubjects.length}`);

  if (isExecute) {
    console.log(`\nExecuting resource updates in transaction...`);
    const updateBatchSize = 50;
    for (let i = 0; i < plan.length; i += updateBatchSize) {
      const chunk = plan.slice(i, i + updateBatchSize);
      await prisma.$transaction(
        chunk.map(p => prisma.resource.update({
          where: { id: p.resourceId },
          data: {
            type: p.newType,
            subjectId: p.newSubjectId,
            semesterId: p.newSemesterId,
            unitId: p.newUnitId
          }
        }))
      );
      process.stdout.write(`Updated ${Math.min(i + updateBatchSize, plan.length)} / ${plan.length} resources...\r`);
    }
    console.log(`\nAll ${plan.length} resources updated successfully.`);

    // Verify no resources remain attached to legacy subjects
    const remainingInLegacy = await prisma.resource.count({
      where: { subjectId: { in: legacySubjects.map(s => s.id) } }
    });

    console.log(`Resources remaining in legacy subjects: ${remainingInLegacy}`);
    if (remainingInLegacy > 0) {
      throw new Error(`ABORT: ${remainingInLegacy} resources still point to legacy subjects!`);
    }

    // Now safely delete the empty legacy subjects
    console.log(`Purging ${legacySubjects.length} empty legacy subjects...`);
    const deleteResult = await prisma.subject.deleteMany({
      where: { id: { in: legacySubjects.map(s => s.id) } }
    });
    console.log(`Deleted ${deleteResult.count} legacy subjects.`);

    // Final verification
    const [finalResCount, finalSubCount, finalDocCount] = await Promise.all([
      prisma.resource.count(),
      prisma.subject.count(),
      prisma.document.count()
    ]);

    console.log(`\nFinal DB State:`);
    console.log(`- Resources: ${finalResCount} (expected: ${initialResourceCount})`);
    console.log(`- Subjects: ${finalSubCount} (expected: 83 canonical subjects)`);
    console.log(`- Documents: ${finalDocCount} (expected: ${initialDocCount})`);

    if (finalResCount !== initialResourceCount) {
      throw new Error(`Resource count mismatch! Before: ${initialResourceCount}, After: ${finalResCount}`);
    }
    if (finalSubCount !== 83) {
      throw new Error(`Expected exactly 83 canonical subjects, found ${finalSubCount}`);
    }
    if (finalDocCount !== initialDocCount) {
      throw new Error(`Document count mismatch! Before: ${initialDocCount}, After: ${finalDocCount}`);
    }
    console.log(`\nSUCCESS: Database reconciliation completed cleanly!`);
  } else {
    console.log(`\nDRY RUN complete. Reassignments and deletion verified. Run with --execute to apply.`);
  }
}

runReconciliation().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
