import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function analyzeAllPlacements() {
  const [resources, subjects, semesters] = await Promise.all([
    prisma.resource.findMany({
      include: {
        subject: { include: { semester: true } },
        semester: true,
        unit: true
      }
    }),
    prisma.subject.findMany({
      include: {
        semester: true,
        units: { orderBy: { order: 'asc' } }
      }
    }),
    prisma.semester.findMany({ orderBy: { order: 'asc' } })
  ]);

  const auditRows: any[] = [];

  for (const r of resources) {
    let impliedSemester: number | null = null;
    let impliedSubject: string | null = null;

    // Detect semester from title
    const t = r.title.toLowerCase();
    for (let sem = 1; sem <= 10; sem++) {
      const ordStr = sem === 1 ? '1st' : sem === 2 ? '2nd' : sem === 3 ? '3rd' : `${sem}th`;
      if (t.includes(`${ordStr} sem`) || t.includes(`${ordStr}  sem`) || t.includes(`${sem} semester`) || t.includes(`semester ${sem}`) || t.includes(`sem ${sem}`)) {
        impliedSemester = sem;
        break;
      }
    }

    // Detect subject from title prefix / keywords
    if (t.includes('family law')) impliedSubject = 'Family Law';
    else if (t.includes('company law') || t.includes('corporate law')) impliedSubject = 'Company Law and Governance'; // or Corporate Law and Management in sem 6
    else if (t.includes('evidence law')) impliedSubject = 'Evidence Law';
    else if (t.includes('labour law') || t.includes('labor law')) impliedSubject = 'Labour Law';
    else if (t.includes('banking law')) impliedSubject = 'Law of Banking and Negotiable Instruments';
    else if (t.includes('criminology and penology')) impliedSubject = 'Criminology and Penology';
    else if (t.includes('procedural law')) {
      if (impliedSemester === 4) impliedSubject = 'Procedural Law - I';
      else if (impliedSemester === 5) impliedSubject = 'Procedural Law - II';
      else impliedSubject = 'Procedural Law';
    }
    else if (t.includes('contract law')) {
      if (impliedSemester === 4) impliedSubject = 'Law of Contract - I';
      else if (impliedSemester === 5) impliedSubject = 'Law of Contract - II';
      else impliedSubject = 'Law of Contract';
    }
    else if (t.includes('criminal law')) {
      if (impliedSemester === 3) impliedSubject = 'Criminal Law - I';
      else if (impliedSemester === 4) impliedSubject = 'Criminal Law - II';
      else impliedSubject = 'Criminal Law';
    }
    else if (t.includes('environmental law')) impliedSubject = 'Environmental Law';
    else if (t.includes('constitutional law')) {
      if (impliedSemester === 3) impliedSubject = 'Constitutional Law - I';
      else if (impliedSemester === 4) impliedSubject = 'Constitutional Law - II';
      else impliedSubject = 'Constitutional Law';
    }
    else if (t.includes('interpretation of law')) impliedSubject = 'Interpretation of Law';
    else if (t.includes('socio-economic crime') || t.includes('socio economic crime')) impliedSubject = 'Socio Economic Crime';
    else if (t.includes('intellectual property')) impliedSubject = 'Intellectual Property Law';
    else if (t.includes('election law')) impliedSubject = 'Election Law';
    else if (t.includes('juvenile delinquency')) impliedSubject = 'Juvenile Delinquency';
    else if (t.includes('gender and inclusive')) impliedSubject = 'Gender and Inclusive Justice';
    else if (t.includes('taxation law')) impliedSubject = 'Taxation Law';
    else if (t.includes('fiscal law')) impliedSubject = 'Fiscal Law';
    else if (t.includes('property law')) impliedSubject = 'Property Law';
    else if (t.includes('civil moot court')) impliedSubject = 'Moot Court - I (Civil Case)';
    else if (t.includes('criminal moot')) impliedSubject = 'Moot Court - II (Criminal Case)';
    else if (t.includes('conveyancing')) impliedSubject = 'Clinical Law - II (Conveyancing)';
    else if (t.includes('public international law') || t.includes('use of force') || t.includes('neutrality')) {
      if (impliedSemester === 4 || t.includes('use of force') || t.includes('neutrality')) impliedSubject = 'Public International Law - II';
      else impliedSubject = 'Public International Law - I';
    }

    const currentSemOrder = r.subject?.semester?.order ?? r.semester?.order ?? null;
    const isMismatch = (impliedSemester !== null && currentSemOrder !== null && impliedSemester !== currentSemOrder);

    auditRows.push({
      id: r.id,
      title: r.title,
      type: r.type,
      currentSubject: r.subject?.name ?? null,
      currentSemOrder,
      impliedSemester,
      impliedSubject,
      isMismatch
    });
  }

  const mismatches = auditRows.filter(a => a.isMismatch);
  console.log(`Total analyzed: ${auditRows.length}`);
  console.log(`Semester mismatches between title and current subject/semester: ${mismatches.length}`);
  
  for (const m of mismatches) {
    console.log(`- Mismatch: "${m.title}"`);
    console.log(`   Current: [Sem ${m.currentSemOrder}] "${m.currentSubject}" vs Implied: [Sem ${m.impliedSemester}] "${m.impliedSubject}"`);
  }

  fs.writeFileSync('scratch/mismatches.json', JSON.stringify(mismatches, null, 2));
}

analyzeAllPlacements().catch(console.error).finally(() => prisma.$disconnect());
