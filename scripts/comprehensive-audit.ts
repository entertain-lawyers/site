import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function main() {
  console.log('=== COMPREHENSIVE RESOURCE PLACEMENT AUDIT ===');
  
  // 1. Semesters
  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      subjects: {
        orderBy: { order: 'asc' },
        include: {
          units: {
            orderBy: { order: 'asc' },
            include: {
              resources: {
                select: { id: true, title: true, type: true, status: true, documentId: true }
              }
            }
          },
          resources: {
            select: { id: true, title: true, type: true, status: true, documentId: true, unitId: true }
          }
        }
      },
      resources: {
        select: { id: true, title: true, type: true, status: true }
      }
    }
  });

  console.log(`\n--- 1. SEMESTERS (${semesters.length}) ---`);
  for (const sem of semesters) {
    const directSubjectCount = sem.subjects.length;
    const directResCount = sem.resources.length;
    let allSubResCount = 0;
    for (const sub of sem.subjects) {
      allSubResCount += sub.resources.length;
      for (const u of sub.units) {
        // resources in units might also be in sub.resources if unitId is set
      }
    }
    console.log(`Semester [${sem.order}] "${sem.name}" (ID: ${sem.id}, slug: ${sem.slug}): ${directSubjectCount} subjects, ${directResCount} direct semester resources, ${allSubResCount} resources attached to subjects`);
  }

  // 2. All Subjects audit (check for duplicates across same name, or legacy names)
  const allSubjects = await prisma.subject.findMany({
    include: {
      semester: true,
      resources: { select: { id: true, title: true, type: true, documentId: true, unitId: true } },
      units: {
        include: {
          resources: { select: { id: true, title: true, type: true } }
        }
      }
    },
    orderBy: [{ semester: { order: 'asc' } }, { order: 'asc' }]
  });

  console.log(`\n--- 2. ALL SUBJECTS (${allSubjects.length}) ---`);
  
  // Group subjects by Semester and normalized name
  const subjectsBySem: Record<string, typeof allSubjects> = {};
  for (const s of allSubjects) {
    const semKey = `${s.semester?.order ?? 'none'} - ${s.semester?.name ?? 'No Semester'}`;
    if (!subjectsBySem[semKey]) subjectsBySem[semKey] = [];
    subjectsBySem[semKey].push(s);
  }

  const duplicatesFound: any[] = [];

  for (const [semKey, subs] of Object.entries(subjectsBySem)) {
    console.log(`\nSemester: ${semKey} (Total subjects: ${subs.length})`);
    const nameMap = new Map<string, typeof subs>();
    for (const s of subs) {
      const norm = s.name.toLowerCase().trim().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ');
      // Also check stem (e.g. "family law" matches "family law-ii" or "family law 2" or "family law")
      const list = nameMap.get(norm) || [];
      list.push(s);
      nameMap.set(norm, list);
      
      const totalUnits = s.units.length;
      const directRes = s.resources.length;
      const unitRes = s.units.reduce((acc, u) => acc + u.resources.length, 0);
      console.log(`  - "${s.name}" (ID: ${s.id}, order: ${s.order}, slug: ${s.slug}): ${directRes} direct resources, ${totalUnits} units (${unitRes} unit resources)`);
    }

    // Check potential duplicate pairs in this semester
    for (let i = 0; i < subs.length; i++) {
      for (let j = i + 1; j < subs.length; j++) {
        const a = subs[i];
        const b = subs[j];
        const na = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nb = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (na === nb || na.includes(nb) || nb.includes(na)) {
          duplicatesFound.push({ semester: semKey, subjectA: { id: a.id, name: a.name, resCount: a.resources.length, units: a.units.length }, subjectB: { id: b.id, name: b.name, resCount: b.resources.length, units: b.units.length } });
        }
      }
    }
  }

  console.log(`\n--- 3. POTENTIAL DUPLICATE / OVERLAPPING SUBJECTS (${duplicatesFound.length}) ---`);
  for (const d of duplicatesFound) {
    console.log(`[${d.semester}]`);
    console.log(`   A: "${d.subjectA.name}" (id: ${d.subjectA.id}) - res: ${d.subjectA.resCount}, units: ${d.subjectA.units}`);
    console.log(`   B: "${d.subjectB.name}" (id: ${d.subjectB.id}) - res: ${d.subjectB.resCount}, units: ${d.subjectB.units}`);
  }

  // 4. Resources Audit
  const allResources = await prisma.resource.findMany({
    include: {
      subject: { include: { semester: true } },
      semester: true,
      unit: true,
      document: true,
    }
  });

  console.log(`\n--- 4. RESOURCES AUDIT (Total: ${allResources.length}) ---`);
  
  let nullSubjectCount = 0;
  let nullSemesterCount = 0;
  let semesterMismatchCount = 0;
  let nullDocumentCount = 0;
  let nullContentAndDocCount = 0;

  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  const orphanedOrAnomalous: any[] = [];

  for (const r of allResources) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

    if (!r.subjectId) nullSubjectCount++;
    if (!r.semesterId) nullSemesterCount++;
    if (r.subject && r.semesterId && r.subject.semesterId !== r.semesterId) {
      semesterMismatchCount++;
      orphanedOrAnomalous.push({
        issue: 'SEMESTER_MISMATCH',
        id: r.id,
        title: r.title,
        resourceSemId: r.semesterId,
        subjectSemId: r.subject.semesterId,
      });
    }

    if (!r.documentId) {
      nullDocumentCount++;
      if (!r.content) {
        nullContentAndDocCount++;
        orphanedOrAnomalous.push({
          issue: 'NO_DOCUMENT_AND_NO_CONTENT',
          id: r.id,
          title: r.title,
          type: r.type,
        });
      }
    }

    // Check if unit belongs to a different subject
    if (r.unit && r.subjectId && r.unit.subjectId !== r.subjectId) {
      orphanedOrAnomalous.push({
        issue: 'UNIT_SUBJECT_MISMATCH',
        id: r.id,
        title: r.title,
        resourceSubjectId: r.subjectId,
        unitSubjectId: r.unit.subjectId,
      });
    }
  }

  console.log('Resource Types:', typeCounts);
  console.log('Resource Statuses:', statusCounts);
  console.log(`Null subjectId: ${nullSubjectCount}`);
  console.log(`Null semesterId: ${nullSemesterCount}`);
  console.log(`Semester mismatch between resource and subject: ${semesterMismatchCount}`);
  console.log(`Null documentId: ${nullDocumentCount} (of which ${nullContentAndDocCount} have no content either)`);
  console.log(`Anomalies found: ${orphanedOrAnomalous.length}`);
  if (orphanedOrAnomalous.length > 0) {
    console.log('Sample anomalies:', orphanedOrAnomalous.slice(0, 10));
  }

  // 5. Document Storage Audit
  const allDocs = await prisma.document.findMany({
    include: {
      resource: { select: { id: true, title: true } },
      Publication: { select: { id: true, title: true } }
    }
  });

  console.log(`\n--- 5. DOCUMENTS AUDIT (Total: ${allDocs.length}) ---`);
  const storageProviders: Record<string, number> = {};
  let orphanedDocs = 0;
  for (const doc of allDocs) {
    storageProviders[doc.storageProvider] = (storageProviders[doc.storageProvider] || 0) + 1;
    if (!doc.resource && !doc.Publication) {
      orphanedDocs++;
    }
  }
  console.log('Storage providers:', storageProviders);
  console.log(`Orphaned documents (no resource, no publication): ${orphanedDocs}`);

  // Write full raw inspection to json for deep analysis
  fs.writeFileSync('scratch/full_audit_results.json', JSON.stringify({
    semestersCount: semesters.length,
    subjectsCount: allSubjects.length,
    resourcesCount: allResources.length,
    documentsCount: allDocs.length,
    duplicatesFound,
    orphanedOrAnomalous,
    nullSubjectCount,
    nullSemesterCount,
  }, null, 2));

  console.log('\nWrote full audit results to scratch/full_audit_results.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
