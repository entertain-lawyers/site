import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Database Duplicate Cleanup (Dry Run)...");
  
  // 1. Identify Semesters
  const semesters = await prisma.semester.findMany({
    include: {
      subjects: {
        include: {
          units: true,
          resources: true,
        }
      }
    }
  });

  const canonicalSemesters = semesters.filter(s => s.slug === null);
  const duplicateSemesters = semesters.filter(s => s.slug !== null);

  console.log(`Found ${canonicalSemesters.length} canonical semesters (slug = null).`);
  console.log(`Found ${duplicateSemesters.length} duplicate semesters (slug != null).`);

  // We will map duplicate semesters to canonical ones based on order.
  for (const dup of duplicateSemesters) {
    const canonical = canonicalSemesters.find(c => c.order === dup.order);
    if (!canonical) {
      console.log(`WARNING: No canonical semester found for order ${dup.order}`);
      continue;
    }

    console.log(`\n--- Processing Semester Order ${dup.order} ---`);
    console.log(`Canonical ID: ${canonical.id} | Duplicate ID: ${dup.id}`);
    
    // For each subject in the duplicate semester, we need to either:
    // a) Move it to the canonical semester (if it doesn't exist there)
    // b) If it DOES exist there (duplicate subject name), move its resources/units and delete the duplicate subject.
    for (const dupSubject of dup.subjects) {
      const existingCanonicalSubject = canonical.subjects.find(s => s.name === dupSubject.name);
      
      if (existingCanonicalSubject) {
        console.log(`[Subject Merge] Duplicate subject "${dupSubject.name}" found in both. Will merge into ${existingCanonicalSubject.id} and delete ${dupSubject.id}.`);
        console.log(`   - Units to migrate: ${dupSubject.units.length}`);
        console.log(`   - Resources to migrate: ${dupSubject.resources.length}`);
      } else {
        console.log(`[Subject Migrate] Moving subject "${dupSubject.name}" (${dupSubject.id}) to canonical semester.`);
      }
    }
    
    console.log(`[Semester Delete] Will delete duplicate semester ${dup.id}`);
  }

  // Handle Sub1 duplicate (which was in the same semester)
  const sub1s = await prisma.subject.findMany({
    where: { name: "Sub1" },
    include: { resources: true, units: true }
  });
  if (sub1s.length > 1) {
    console.log(`\n--- Processing Sub1 Duplicates ---`);
    console.log(`Found ${sub1s.length} Sub1 records.`);
    const canonicalSub1 = sub1s[0];
    const duplicateSub1 = sub1s[1];
    console.log(`Will merge resources from ${duplicateSub1.id} into ${canonicalSub1.id} and delete duplicate.`);
  }

  console.log("\nDry run complete. No changes made.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
