import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG } from '../src/lib/syllabus-config';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Phase E.3 Syllabus Reconciliation (Read-Only) ---\n');

  const existingSemesters = await prisma.semester.findMany({
    include: { subjects: true }
  });
  
  const existingSubjects = await prisma.subject.findMany();

  console.log(`Found ${existingSemesters.length} existing semesters and ${existingSubjects.length} existing subjects in DB.\n`);

  const unmatchedSubjects: string[] = [];
  const matchedSubjects: any[] = [];
  
  for (const semConfig of SYLLABUS_CONFIG) {
    console.log(`\nReconciling ${semConfig.name}...`);
    const dbSem = existingSemesters.find(s => s.order === semConfig.order || s.name.toLowerCase() === semConfig.name.toLowerCase());
    if (!dbSem) {
      console.log(`  [MISSING SEMESTER] ${semConfig.name} (order: ${semConfig.order}) not found in DB.`);
    } else {
      console.log(`  [MATCHED SEMESTER] ${semConfig.name} -> DB ID: ${dbSem.id}`);
    }

    for (const subConfig of semConfig.subjects) {
      const dbSub = existingSubjects.find(s => s.name.toLowerCase() === subConfig.name.toLowerCase());
      if (dbSub) {
        matchedSubjects.push({ config: subConfig, db: dbSub });
        console.log(`    [MATCH] ${subConfig.name} -> DB ID: ${dbSub.id}`);
      } else {
        unmatchedSubjects.push(subConfig.name);
        console.log(`    [MISSING] ${subConfig.name}`);
      }
    }
  }

  console.log(`\n--- Reconciliation Summary ---`);
  console.log(`Total Configured Subjects: ${SYLLABUS_CONFIG.reduce((acc, sem) => acc + sem.subjects.length, 0)}`);
  console.log(`Matched Subjects: ${matchedSubjects.length}`);
  console.log(`Missing/Unmatched Subjects: ${unmatchedSubjects.length}`);
  
  if (unmatchedSubjects.length > 0) {
    console.log(`\nUnmatched Subjects List:`);
    unmatchedSubjects.forEach(name => console.log(` - ${name}`));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
