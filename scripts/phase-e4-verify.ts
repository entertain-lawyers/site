import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG } from '../src/lib/syllabus-config';

const prisma = new PrismaClient();

async function main() {
  console.log("--- E.4 Database Verification ---");

  // 1. Semesters
  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: { subjects: true }
  });
  console.log(`Semesters Count: ${semesters.length}`);
  semesters.forEach(s: any => console.log(`[Order: ${s.order}] ${s.name} (Subjects: ${s.subjects.length})`));

  // 2. Total Subjects
  const allSubjects = await prisma.subject.findMany({ include: { resources: true } });
  console.log(`\nTotal Subjects in DB: ${allSubjects.length}`);

  // 3. Duplicates Check
  const nameMap = new Map();
  allSubjects.forEach(s: any => {
    const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!nameMap.has(norm)) nameMap.set(norm, []);
    nameMap.get(norm).push(s);
  });
  const duplicates = Array.from(nameMap.values()).filter(group => group.length > 1);
  console.log(`Duplicate Subjects Found: ${duplicates.length}`);
  duplicates.forEach(d => console.log(` - ${d.map(s: any => s.name).join(', ')}`));

  // 4. Sitaram Kedia check
  const sitaram = await prisma.resource.findFirst({
    where: { title: { contains: 'Sitaram Kedia', mode: 'insensitive' } },
    include: { subject: true }
  });
  console.log(`\nSitaram Kedia resource found: ${!!sitaram}`);
  if (sitaram) {
    console.log(` Assigned to Subject: ${sitaram.subject?.name} (ID: ${sitaram.subjectId})`);
  }

  // 5. Unlinked resources check
  // Find resources whose subject is NOT one of the 83 newly updated syllabus subjects
  const syllabusSubIds = new Set(semesters.flatMap(sem => sem.subjects.map(sub => sub.id)));
  const unlinkedResources = await prisma.resource.findMany({
    where: {
      subjectId: { notIn: Array.from(syllabusSubIds) }
    },
    include: { subject: true }
  });
  console.log(`\nResources not assigned to any of the 83 syllabus subjects: ${unlinkedResources.length}`);
  const unlinkedGrouped = new Map();
  unlinkedResources.forEach(r => {
    const sName = r.subject ? r.subject.name : 'Unassigned/Legacy';
    unlinkedGrouped.set(sName, (unlinkedGrouped.get(sName) || 0) + 1);
  });
  unlinkedGrouped.forEach((count, name) => console.log(` - ${name}: ${count} resources`));

  // 6. Old vs New subjects (created vs linked)
  const createdAfter = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  // Note: Prisma schema does not have createdAt on Subject? Let me check schema.
}

main().finally(() => prisma.$disconnect());
