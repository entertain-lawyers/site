import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("--- E.5 Database Investigation ---");

  // 1. Semesters
  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      subjects: {
        include: { resources: true }
      }
    }
  });

  const semGroups = new Map();
  for (const s of semesters) {
    const key = `Order ${s.order}`;
    if (!semGroups.has(key)) semGroups.set(key, []);
    semGroups.get(key).push(s);
  }

  console.log("\n--- Semester Duplicates ---");
  for (const [key, sems] of semGroups.entries()) {
    if (sems.length > 1) {
      console.log(`\n${key}:`);
      for (const s of sems) {
        const subCount = s.subjects.length;
        const resCount = s.subjects.reduce((sum: any, sub: any) => sum + sub.resources.length, 0);
        console.log(` - ID: ${s.id} | Name: "${s.name}" | Slug: ${s.slug} | Subjects: ${subCount} | Total Resources: ${resCount}`);
      }
    }
  }

  // 2. Subjects
  const allSubjects = await prisma.subject.findMany({
    include: {
      semester: true,
      resources: true,
      units: true
    }
  });

  const nameMap = new Map();
  for (const s of allSubjects) {
    const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!nameMap.has(norm)) nameMap.set(norm, []);
    nameMap.get(norm).push(s);
  }

  console.log("\n--- Subject Duplicates ---");
  for (const [norm, subs] of nameMap.entries()) {
    if (subs.length > 1) {
      console.log(`\nDuplicate Group: ${norm}`);
      for (const s of subs) {
        console.log(` - ID: ${s.id} | Name: "${s.name}" | Slug: ${s.slug} | Semester: ${s.semester.name} (Order: ${s.semester.order}) | Resources: ${s.resources.length} | Units: ${s.units.length}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
