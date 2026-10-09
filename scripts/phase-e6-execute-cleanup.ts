import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Database Duplicate Cleanup...");
  
  await prisma.$transaction(async (tx) => {
    // 1. Fetch all semesters
    const semesters = await tx.semester.findMany({
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

    // 2. Resolve the multiple legacy `order: 1` canonical semesters
    const order1Semesters = canonicalSemesters.filter(s => s.order === 1);
    if (order1Semesters.length > 1) {
      console.log(`Found ${order1Semesters.length} canonical semesters with order=1. Merging them...`);
      // Pick the first one as canonical
      const masterOrder1 = order1Semesters[0];
      const others = order1Semesters.slice(1);
      
      for (const other of others) {
        // Move all subjects from 'other' to 'master'
        for (const subj of other.subjects) {
          // Check if subject name already exists in master
          const existing = await tx.subject.findFirst({
            where: { semesterId: masterOrder1.id, name: subj.name }
          });
          if (existing) {
            console.log(`  Merging Subject ${subj.name} (${subj.id}) into ${existing.id}`);
            await tx.resource.updateMany({
              where: { subjectId: subj.id },
              data: { subjectId: existing.id }
            });
            await tx.unit.updateMany({
              where: { subjectId: subj.id },
              data: { subjectId: existing.id }
            });
            await tx.subject.delete({ where: { id: subj.id } });
          } else {
            console.log(`  Moving Subject ${subj.name} (${subj.id}) to master Semester 1`);
            await tx.subject.update({
              where: { id: subj.id },
              data: { semesterId: masterOrder1.id }
            });
          }
        }
        console.log(`  Deleting legacy duplicate Semester 1 (${other.id})`);
        await tx.semester.delete({ where: { id: other.id } });
      }
      
      // Update our canonical array to remove the deleted ones
      for (const other of others) {
        const idx = canonicalSemesters.findIndex(s => s.id === other.id);
        if (idx !== -1) canonicalSemesters.splice(idx, 1);
      }
    }

    // 3. Reassign Phase E.3 duplicate semesters to canonical ones
    for (const dup of duplicateSemesters) {
      const canonical = canonicalSemesters.find(c => c.order === dup.order);
      if (!canonical) {
        console.log(`WARNING: No canonical semester found for order ${dup.order}`);
        continue;
      }

      console.log(`\n--- Migrating E.3 Semester Order ${dup.order} (${dup.slug}) ---`);
      
      for (const dupSubject of dup.subjects) {
        const existingCanonicalSubject = await tx.subject.findFirst({
          where: { semesterId: canonical.id, name: dupSubject.name }
        });
        
        if (existingCanonicalSubject) {
          console.log(`  [Subject Merge] Merging "${dupSubject.name}" into canonical ID: ${existingCanonicalSubject.id}`);
          await tx.resource.updateMany({
            where: { subjectId: dupSubject.id },
            data: { subjectId: existingCanonicalSubject.id }
          });
          await tx.unit.updateMany({
            where: { subjectId: dupSubject.id },
            data: { subjectId: existingCanonicalSubject.id }
          });
          await tx.subject.delete({ where: { id: dupSubject.id } });
        } else {
          console.log(`  [Subject Migrate] Moving "${dupSubject.name}" to canonical semester ${canonical.id}`);
          await tx.subject.update({
            where: { id: dupSubject.id },
            data: { semesterId: canonical.id }
          });
        }
      }
      
      console.log(`  [Semester Delete] Deleting E.3 duplicate semester ${dup.id}`);
      await tx.semester.delete({ where: { id: dup.id } });
      
      // Inherit the slug onto the canonical semester
      console.log(`  [Semester Update] Adopting slug '${dup.slug}' for canonical semester ${canonical.id}`);
      await tx.semester.update({
        where: { id: canonical.id },
        data: { slug: dup.slug }
      });
    }

    // 4. Eliminate duplicate subject names globally (e.g. Alternative English)
    console.log(`\n--- Eliminating duplicate subject names globally ---`);
    const allSubjects = await tx.subject.findMany({ include: { semester: true } });
    const nameMap = new Map();
    for (const s of allSubjects) {
      const arr = nameMap.get(s.name) || [];
      arr.push(s);
      nameMap.set(s.name, arr);
    }
    
    for (const [name, arr] of nameMap.entries()) {
      if (arr.length > 1) {
        console.log(`Found duplicate subject name: "${name}" (${arr.length} copies)`);
        // We will suffix them by semester to make their names unique
        for (const subj of arr) {
          const newName = `${name} (Semester ${subj.semester.order})`;
          console.log(`  Renaming to: "${newName}"`);
          await tx.subject.update({
            where: { id: subj.id },
            data: { name: newName }
          });
        }
      }
    }
    
    console.log("\nCleanup successfully completed inside transaction!");
  }, {
    maxWait: 15000,
    timeout: 30000,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
