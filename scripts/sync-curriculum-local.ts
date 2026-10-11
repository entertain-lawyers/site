import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG, normalizeSubjectName } from '../src/lib/syllabus-config';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function assertLocalDatabaseOnly() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  const forbiddenIndicators = [
    'neon.tech',
    'neondb',
    'aws.neon',
    'preview',
    'prod',
    'production',
    'pooler.neon.tech',
  ];

  for (const indicator of forbiddenIndicators) {
    if (dbUrl.toLowerCase().includes(indicator)) {
      throw new Error(
        `FATAL SAFETY VIOLATION: Target database URL appears to be hosted/remote ("${indicator}"). Script is strictly restricted to local development.`
      );
    }
  }

  // Must be localhost or 127.0.0.1 or docker local
  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('5432') ||
    dbUrl.includes('postgresql://postgres:') ||
    dbUrl.includes('postgresql://admin:');

  if (!isLocal) {
    throw new Error(
      'FATAL SAFETY VIOLATION: Database URL does not match known local development patterns (localhost / 127.0.0.1).'
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--write') || args.includes('--live');

  console.log(`=== LOCAL CURRICULUM SYNCHRONIZATION [${isLive ? 'LIVE WRITE' : 'DRY RUN'}] ===\n`);

  if (isLive) {
    assertLocalDatabaseOnly();
    console.log('✅ Verified target is strictly the local development database.\n');
  } else {
    console.log('ℹ️ DRY RUN MODE: No modifications will be made to any database.\n');
  }

  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      subjects: {
        include: {
          units: true,
          resources: true,
        },
      },
    },
  });

  const canonicalSemesters = semesters.filter((s) => s.name.includes('Semester'));
  const updatePlan: Array<{
    id: string;
    semesterOrder: number;
    semesterName: string;
    currentName: string;
    canonicalName: string;
    currentOrder: number;
    canonicalOrder: number;
    unitCount: number;
    resourceCount: number;
    needsNameUpdate: boolean;
    needsOrderUpdate: boolean;
  }> = [];

  const unmatchedExpected: string[] = [];

  for (const expSem of SYLLABUS_CONFIG) {
    const dbSem = canonicalSemesters.find((s) => s.order === expSem.order);
    if (!dbSem) {
      unmatchedExpected.push(`Semester ${expSem.order}: "${expSem.name}" not found in DB`);
      continue;
    }

    for (const expSub of expSem.subjects) {
      const expNorm = normalizeSubjectName(expSub.name);

      // 1. Exact match
      let match = dbSem.subjects.find((s) => s.name === expSub.name);

      // 2. Normalized match
      if (!match) {
        match = dbSem.subjects.find((s) => normalizeSubjectName(s.name) === expNorm);
      }

      // 3. Prefix/containment match for known variations (e.g. "Alternative English ... (Semester 1)")
      if (!match) {
        match = dbSem.subjects.find((s) => {
          const sNorm = normalizeSubjectName(s.name);
          return sNorm.startsWith(expNorm) || expNorm.startsWith(sNorm);
        });
      }

      if (!match) {
        unmatchedExpected.push(`Sem ${expSem.order} Sub: "${expSub.name}"`);
        continue;
      }

      const needsNameUpdate = match.name !== expSub.name;
      const needsOrderUpdate = match.order !== expSub.order;

      updatePlan.push({
        id: match.id,
        semesterOrder: expSem.order,
        semesterName: expSem.name,
        currentName: match.name,
        canonicalName: expSub.name,
        currentOrder: match.order,
        canonicalOrder: expSub.order,
        unitCount: match.units.length,
        resourceCount: match.resources.length,
        needsNameUpdate,
        needsOrderUpdate,
      });
    }
  }

  if (unmatchedExpected.length > 0) {
    console.error('❌ Found unmatched expected subjects:');
    console.error(unmatchedExpected.join('\n'));
    throw new Error('Aborting: Not all authoritative subjects could be matched.');
  }

  console.log(`Matched all ${updatePlan.length} authoritative subjects (Expected: 83).\n`);

  const nameChanges = updatePlan.filter((p) => p.needsNameUpdate);
  const orderChanges = updatePlan.filter((p) => p.needsOrderUpdate);

  console.log(`Summary of proposed synchronization:`);
  console.log(`- Total authoritative subjects: ${updatePlan.length}`);
  console.log(`- Exact name & order matches already in sync: ${updatePlan.length - nameChanges.length - orderChanges.length}`);
  console.log(`- Subjects requiring name standardization: ${nameChanges.length}`);
  console.log(`- Subjects requiring order update: ${orderChanges.length}\n`);

  if (nameChanges.length > 0) {
    console.log(`=== THE ${nameChanges.length} NAME STANDARDIZATIONS ===`);
    console.table(
      nameChanges.map((c) => ({
        Semester: c.semesterOrder,
        ID: c.id,
        'Current Name in DB': c.currentName,
        'Canonical Client Name': c.canonicalName,
        Units: c.unitCount,
        Resources: c.resourceCount,
      }))
    );
  }

  if (!isLive) {
    console.log('\nDRY RUN complete. 0 database records were modified.');
    console.log('To apply these safe updates to the local development database, run:');
    console.log('  npx tsx scripts/sync-curriculum-local.ts --write\n');
    return;
  }

  console.log('\nExecuting safe updates in transaction...');
  await prisma.$transaction(
    updatePlan.map((p) =>
      prisma.subject.update({
        where: { id: p.id },
        data: {
          name: p.canonicalName,
          order: p.canonicalOrder,
        },
      })
    )
  );

  console.log(`✅ Successfully updated ${updatePlan.length} subjects in local database.`);
}

main()
  .catch((e) => {
    console.error('Error during synchronization:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
