import { PrismaClient, ResourceType } from '@prisma/client';
import fs from 'fs';
import { SYLLABUS_CONFIG, normalizeSubjectName } from '../src/lib/syllabus-config';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function buildCanonicalMapping() {
  const [resources, subjects, semesters] = await Promise.all([
    prisma.resource.findMany({
      include: {
        document: true,
        subject: { include: { semester: true } },
        semester: true,
        unit: true
      },
      orderBy: { title: 'asc' }
    }),
    prisma.subject.findMany({
      include: {
        semester: true,
        units: { orderBy: { order: 'asc' } },
        _count: { select: { resources: true } }
      },
      orderBy: [{ semester: { order: 'asc' } }, { order: 'asc' }]
    }),
    prisma.semester.findMany({ orderBy: { order: 'asc' } })
  ]);

  // Identify the 83 canonical subjects
  const canonicalMap = new Map<string, typeof subjects[0]>(); // key: `${semOrder}-${normSubjectName}`
  const canonicalById = new Map<string, typeof subjects[0]>();

  for (const semConfig of SYLLABUS_CONFIG) {
    const sem = semesters.find(s => s.order === semConfig.order)!;
    const semSubs = subjects.filter(s => s.semesterId === sem.id);

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

      // Best match has units
      const chosen = [...matches].sort((a, b) => b.units.length - a.units.length)[0];
      if (chosen) {
        canonicalMap.set(`${semConfig.order}-${authNorm}`, chosen);
        canonicalById.set(chosen.id, chosen);
      }
    }
  }

  console.log(`Indexed ${canonicalById.size} canonical subjects out of 83`);

  const helperGetCanonical = (semOrder: number, subjectNamePart: string) => {
    const semConfig = SYLLABUS_CONFIG.find(c => c.order === semOrder);
    if (!semConfig) return null;
    const authSub = semConfig.subjects.find(s => 
      s.name.toLowerCase().includes(subjectNamePart.toLowerCase()) ||
      normalizeSubjectName(s.name).includes(normalizeSubjectName(subjectNamePart))
    );
    if (!authSub) return null;
    const authNorm = normalizeSubjectName(authSub.name);
    return canonicalMap.get(`${semOrder}-${authNorm}`) || null;
  };

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
  }> = [];

  for (const r of resources) {
    let targetSubject: typeof subjects[0] | null = null;
    let targetSemesterId: string | null = null;
    let targetUnitId: string | null = r.unitId;
    let targetUnitName: string | null = r.unit?.name ?? null;
    let targetType: ResourceType = r.type;
    let reason = 'Keep current canonical placement';

    const t = r.title.trim().toLowerCase();
    const tClean = t.replace(/[-_]/g, ' ');

    // 1. Moot court / conveyancing practical files
    if (t.includes('criminal moot')) {
      targetType = 'OTHER';
      targetSubject = helperGetCanonical(9, 'Moot Court - II (Criminal Case)');
      reason = '9th Semester Criminal Moot Court';
    } else if (t.includes('civil moot court')) {
      targetType = 'OTHER';
      targetSubject = helperGetCanonical(8, 'Moot Court - I (Civil Case)');
      reason = '8th Semester Civil Moot Court';
    } else if (t.includes('clinical law-ii (conveyancing)')) {
      targetType = 'LAW_NOTE';
      targetSubject = helperGetCanonical(8, 'Clinical Law - II (Conveyancing)');
      reason = '8th Semester Clinical Law - II (Conveyancing)';
    }
    // 2. Socio-Economic Crime case misclassified as OLD_QUESTION
    else if (t.includes('socio-economic crime: dhankumari sitaula') || t.includes('dhana kumari sitaula')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(6, 'Socio Economic Crime');
      reason = '6th Semester Socio Economic Crime Case';
    }
    // 3. Genuine OLD_QUESTION papers
    else if (tClean.includes('old question') || tClean.includes('question collection') || tClean.includes('questions collection')) {
      targetType = 'OLD_QUESTION';
      // Find semester
      for (let s = 1; s <= 10; s++) {
        const ord = s === 1 ? '1st' : s === 2 ? '2nd' : s === 3 ? '3rd' : `${s}th`;
        const wordOrd = s === 1 ? 'first' : s === 2 ? 'second' : s === 3 ? 'third' : s === 4 ? 'fourth' : s === 5 ? 'fifth' : s === 6 ? 'sixth' : s === 7 ? 'seventh' : s === 8 ? 'eight' : s === 9 ? 'ninth' : 'tenth';
        if (tClean.includes(`${ord} sem`) || tClean.includes(`${s} semester`) || tClean.includes(`${wordOrd} sem`) || (r.document?.storageKey && r.document.storageKey.toLowerCase().includes(`${wordOrd}-sem`))) {
          const sem = semesters.find(sem => sem.order === s);
          if (sem) targetSemesterId = sem.id;
          break;
        }
      }
      targetSubject = null;
      targetUnitId = null;
      targetUnitName = null;
      reason = 'Semester-level Old Question paper collection';
    }
    // 4. Family Law cases
    else if (t.includes('family law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(4, 'Family Law');
      reason = '4th Semester Family Law Case';
    }
    // 5. Contract Law cases
    else if (t.includes('contract law') || t.includes('contract  law')) {
      targetType = 'CASE_LAW';
      if (t.includes('5th sem') || t.includes('5t sem')) {
        targetSubject = helperGetCanonical(5, 'Law of Contract - II');
        reason = '5th Semester Contract Law - II Case';
      } else {
        targetSubject = helperGetCanonical(4, 'Law of Contract - I');
        reason = '4th Semester Contract Law - I Case';
      }
    }
    // 6. Company / Corporate Law
    else if (t.includes('company law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(5, 'Company Law and Governance');
      reason = '5th Semester Company Law and Governance Case';
    } else if (t.includes('corporate law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(6, 'Corporate Law and Management');
      reason = '6th Semester Corporate Law and Management Case';
    }
    // 7. Evidence Law
    else if (t.includes('evidence law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(7, 'Evidence Law');
      reason = '7th Semester Evidence Law Case';
    }
    // 8. Labour Law
    else if (t.includes('labour law') || t.includes('labor law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(7, 'Labour Law');
      reason = '7th Semester Labour Law Case';
    }
    // 9. Banking Law
    else if (t.includes('banking law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(9, 'Law of Banking and Negotiable Instruments');
      reason = '9th Semester Banking Law Case';
    }
    // 10. Procedural Law
    else if (t.includes('procedural law')) {
      targetType = 'CASE_LAW';
      if (t.includes('5th sem')) {
        targetSubject = helperGetCanonical(5, 'Procedural Law - II');
        reason = '5th Semester Procedural Law - II Case';
      } else {
        targetSubject = helperGetCanonical(4, 'Procedural Law - I');
        reason = '4th Semester Procedural Law - I Case';
      }
    }
    // 11. Criminal Law
    else if (t.includes('criminal law')) {
      targetType = 'CASE_LAW';
      if (t.includes('4th sem')) {
        targetSubject = helperGetCanonical(4, 'Criminal Law - II');
        reason = '4th Semester Criminal Law - II Case';
      } else {
        targetSubject = helperGetCanonical(3, 'Criminal Law - I');
        reason = '3rd Semester Criminal Law - I Case';
      }
    }
    // 12. Property Law
    else if (t.includes('property law case:')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(3, 'Property Law');
      reason = '3rd Semester Property Law Case';
    } else if (t.includes('intellectual property')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(6, 'Intellectual Property Law');
      reason = '6th Semester Intellectual Property Law Case';
    }
    // 13. Gender and Inclusive Justice
    else if (t.includes('gender and inclusive') || t.includes('gender justice') || t.includes('lakpa sherpa')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(8, 'Gender and Inclusive Justice');
      reason = '8th Semester Gender and Inclusive Justice Case';
    }
    // 14. Public International Law
    else if (t.includes('use of force and war') || t.includes('neutrality') || (t.includes('public international law') && t.includes('4th sem'))) {
      targetType = 'LAW_NOTE';
      targetSubject = helperGetCanonical(4, 'Public International Law - II');
      reason = '4th Semester Public International Law - II Note';
    } else if (t.includes('public international law')) {
      targetSubject = helperGetCanonical(3, 'Public International Law - I');
      reason = '3rd Semester Public International Law - I Case';
    }
    // 15. Interpretation of Law
    else if (t.includes('interpretation of law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(6, 'Interpretation of Law');
      reason = '6th Semester Interpretation of Law Case';
    }
    // 16. Socio Economic Crime
    else if (t.includes('socio economic crime') || t.includes('socio-economic crime')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(6, 'Socio Economic Crime');
      reason = '6th Semester Socio Economic Crime Case';
    }
    // 17. Juvenile Delinquency
    else if (t.includes('juvenile delinquency')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(5, 'Juvenile Delinquency');
      reason = '5th Semester Juvenile Delinquency Case';
    }
    // 18. Election Law
    else if (t.includes('election law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(5, 'Election Law');
      reason = '5th Semester Election Law Case';
    }
    // 19. Criminology and Penology
    else if (t.includes('criminology and penology')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(5, 'Criminology and Penology');
      reason = '5th Semester Criminology and Penology Case';
    }
    // 20. Fiscal Law
    else if (t.includes('fiscal law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(7, 'Fiscal Law');
      reason = '7th Semester Fiscal Law Case';
    }
    // 21. Taxation Law
    else if (t.includes('taxation law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(9, 'Taxation Law');
      reason = '9th Semester Taxation Law Case';
    }
    // 22. Environmental Law
    else if (t.includes('environmental law')) {
      targetType = 'CASE_LAW';
      targetSubject = helperGetCanonical(7, 'Environmental Law');
      reason = '7th Semester Environmental Law Case';
    }
    // 23. Ramsharan Varma
    else if (t.includes('ramsharan varma')) {
      targetType = 'CASE_LAW';
      const sem7 = semesters.find(sem => sem.order === 7);
      if (sem7) targetSemesterId = sem7.id;
      reason = '7th Semester Case Law';
    }
    // 24. Test fixtures
    else if (['r1', 'free doc', 'concurrency test', 'prem doc', 'prem doc 2'].includes(t)) {
      targetSubject = r.subject ? (canonicalById.get(r.subject.id) || null) : null;
      reason = 'Test fixture';
    }
    // 25. Standalone articles / news
    else if (t.includes('brutal rape') || t.includes('online betting') || t.includes('second murder') || t.includes('girlfriend raped') || t.includes('right to protest')) {
      targetType = 'OTHER';
      targetSubject = null;
      targetSemesterId = null;
      targetUnitId = null;
      targetUnitName = null;
      reason = 'Standalone editorial article';
    }
    // 26. Attached to an existing subject
    else if (r.subject) {
      const canonicalMatch = canonicalById.get(r.subject.id);
      if (canonicalMatch) {
        targetSubject = canonicalMatch;
        reason = 'Already attached to canonical subject';
      } else {
        // Find canonical subject with same/similar name in same semester if possible
        const rSemOrder = r.subject.semester?.order;
        if (rSemOrder) {
          const match = helperGetCanonical(rSemOrder, r.subject.name);
          if (match) {
            targetSubject = match;
            reason = `Mapped legacy subject "${r.subject.name}" in Sem ${rSemOrder} to canonical`;
          }
        }
        if (!targetSubject) {
          for (const [key, can] of canonicalMap.entries()) {
            if (normalizeSubjectName(can.name) === normalizeSubjectName(r.subject.name)) {
              targetSubject = can;
              reason = `Mapped from legacy subject "${r.subject.name}" to canonical`;
              break;
            }
          }
        }
      }
    }

    // Set target semester ID from target subject if subject is determined
    if (targetSubject) {
      targetSemesterId = targetSubject.semesterId;
      // If type is CASE_LAW, assign to "Prescribed Cases" unit if available and no unit currently assigned
      if (targetType === 'CASE_LAW' && !targetUnitId) {
        const prescribedUnit = targetSubject.units.find(u => 
          u.name.toLowerCase().includes('prescribed') || u.name.toLowerCase().includes('case')
        );
        if (prescribedUnit) {
          targetUnitId = prescribedUnit.id;
          targetUnitName = prescribedUnit.name;
        }
      }

      // If unit still not assigned, check if title mentions a unit number (e.g. Unit-1, Unit 2)
      if (!targetUnitId) {
        const unitMatch = t.match(/unit[- ]?(\d+)/i);
        if (unitMatch) {
          const uNum = parseInt(unitMatch[1], 10);
          const matchUnit = targetSubject.units.find(u => u.order === uNum || u.name.toLowerCase() === `unit ${uNum}`);
          if (matchUnit) {
            targetUnitId = matchUnit.id;
            targetUnitName = matchUnit.name;
          }
        }
      }
    }

    plan.push({
      resourceId: r.id,
      title: r.title,
      currentType: r.type,
      newType: targetType,
      currentSubjectId: r.subjectId,
      newSubjectId: targetSubject?.id ?? (r.subjectId && canonicalById.has(r.subjectId) ? r.subjectId : null),
      newSubjectName: targetSubject?.name ?? (r.subjectId && canonicalById.has(r.subjectId) ? canonicalById.get(r.subjectId)!.name : null),
      currentSemesterId: r.semesterId,
      newSemesterId: targetSemesterId ?? r.semesterId,
      currentUnitId: r.unitId,
      newUnitId: targetUnitId,
      newUnitName: targetUnitName,
      reason
    });
  }

  fs.writeFileSync('scratch/reconciliation_plan.json', JSON.stringify(plan, null, 2));
  console.log(`Plan written for all ${plan.length} resources!`);

  let remappedCount = 0;
  let semAssignedCount = 0;
  let typeFixedCount = 0;
  let unitAssignedCount = 0;

  for (const p of plan) {
    if (p.currentSubjectId !== p.newSubjectId) remappedCount++;
    if (p.currentSemesterId !== p.newSemesterId && p.newSemesterId !== null) semAssignedCount++;
    if (p.currentType !== p.newType) typeFixedCount++;
    if (p.currentUnitId !== p.newUnitId && p.newUnitId !== null) unitAssignedCount++;
  }

  console.log(`Summary of proposed changes:`);
  console.log(`- Subject reassignments: ${remappedCount}`);
  console.log(`- Semester ID assignments: ${semAssignedCount}`);
  console.log(`- Resource Type corrections: ${typeFixedCount}`);
  console.log(`- Unit assignments: ${unitAssignedCount}`);
}

buildCanonicalMapping().catch(console.error).finally(() => prisma.$disconnect());
