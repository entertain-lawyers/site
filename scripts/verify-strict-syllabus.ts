import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG } from '../src/lib/syllabus-config';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Strict Syllabus Verification...");

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('preview') && !dbUrl.includes('branch_') && !dbUrl.includes('neondb')) {
    throw new Error('ABORT: Must run against the Neon preview database.');
  }

  const semesters = await prisma.semester.findMany({
    include: {
      subjects: {
        include: { units: true }
      }
    },
    orderBy: { order: 'asc' }
  });

  if (semesters.length !== 10) {
    throw new Error(`Expected exactly 10 semesters, found ${semesters.length}`);
  }

  let totalSubjects = 0;
  let totalUnits = 0;
  let hasErrors = false;

  for (const expectedSem of SYLLABUS_CONFIG) {
    const actualSem = semesters.find(s => s.order === expectedSem.order);
    if (!actualSem) {
      console.error(`❌ Semester ${expectedSem.order} not found in DB`);
      hasErrors = true;
      continue;
    }

    if (actualSem.subjects.length !== expectedSem.subjects.length) {
      console.error(`❌ Semester ${expectedSem.order} subject count mismatch: Expected ${expectedSem.subjects.length}, found ${actualSem.subjects.length}`);
      
      const expectedNames = expectedSem.subjects.map(s => s.name);
      const actualNames = actualSem.subjects.map(s => s.name);
      
      const missing = expectedNames.filter(n => !actualNames.includes(n));
      const extra = actualNames.filter(n => !expectedNames.includes(n));
      
      if (missing.length > 0) console.error(`   Missing: ${missing.join(', ')}`);
      if (extra.length > 0) console.error(`   Extra: ${extra.join(', ')}`);
      hasErrors = true;
    } else {
      console.log(`✅ Semester ${expectedSem.order} Subject Count: ${actualSem.subjects.length}`);
    }

    totalSubjects += actualSem.subjects.length;
    actualSem.subjects.forEach(s => {
      totalUnits += s.units.length;
    });
  }

  if (hasErrors) {
    throw new Error("Strict Syllabus Verification Failed: Database contains extra or missing subjects.");
  }

  console.log(`\n🎉 Verification Passed!`);
  console.log(`Total Valid Subjects: ${totalSubjects}`);
  console.log(`Total Valid Units: ${totalUnits}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
