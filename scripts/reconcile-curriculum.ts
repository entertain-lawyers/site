import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface ExpectedSubject {
  name: string;
  order: number;
  expectedUnits?: number;
  hasPrescribedCases?: boolean;
  notes?: string;
}

interface ExpectedSemester {
  order: number;
  name: string;
  subjects: ExpectedSubject[];
}

const AUTHORITATIVE_CURRICULUM: ExpectedSemester[] = [
  {
    order: 1,
    name: '1st Semester',
    subjects: [
      { name: 'Legal Method', order: 1, expectedUnits: 5 },
      { name: 'Legal Nepali - I', order: 2, expectedUnits: 2 },
      { name: 'Alternative English (for Foreigners in Lieu of Legal Nepali)', order: 3, expectedUnits: 5 },
      { name: 'Legal English - I', order: 4, expectedUnits: 6 },
      { name: 'Political Theory', order: 5, expectedUnits: 7 },
      { name: 'Nepali History', order: 6, expectedUnits: 5 },
      { name: 'Sociology', order: 7, expectedUnits: 7 },
      { name: 'Economics - I', order: 8, expectedUnits: 5 },
    ],
  },
  {
    order: 2,
    name: '2nd Semester',
    subjects: [
      { name: 'Jurisprudence - I', order: 1, expectedUnits: 5 },
      { name: 'Legal Nepali - II', order: 2, expectedUnits: 3 },
      { name: 'Alternative English (for Foreigners in Lieu of Legal Nepali)', order: 3, expectedUnits: 2 },
      { name: 'Legal English - II', order: 4, expectedUnits: 6 },
      { name: 'Political Thoughts', order: 5, expectedUnits: 5 },
      { name: 'Global History', order: 6, expectedUnits: 5 },
      { name: 'Anthropology', order: 7, expectedUnits: 9 },
      { name: 'Economics - II', order: 8, expectedUnits: 6 },
    ],
  },
  {
    order: 3,
    name: '3rd Semester',
    subjects: [
      { name: 'Jurisprudence - II', order: 1, expectedUnits: 7 },
      { name: 'Constitutional Law - I', order: 2, expectedUnits: 6 },
      { name: 'International Relations and Diplomacy', order: 3, expectedUnits: 7 },
      { name: 'Criminal Law - I', order: 4, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Public International Law - I', order: 5, expectedUnits: 9 },
      { name: 'Property Law', order: 6, expectedUnits: 13, hasPrescribedCases: true, notes: 'Old Syllabus & New Syllabus' },
      { name: 'Comparative Law', order: 7, expectedUnits: 7 },
    ],
  },
  {
    order: 4,
    name: '4th Semester',
    subjects: [
      { name: 'Criminal Law - II', order: 1, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'Public International Law - II', order: 2, expectedUnits: 8 },
      { name: 'Constitutional Law - II', order: 3, expectedUnits: 7 },
      { name: 'Family Law', order: 4, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Law of Contract - I', order: 5, expectedUnits: 8, hasPrescribedCases: true },
      { name: 'Procedural Law - I', order: 6, expectedUnits: 5, hasPrescribedCases: true },
      { name: 'Nepali Legal System', order: 7, expectedUnits: 5 },
    ],
  },
  {
    order: 5,
    name: '5th Semester',
    subjects: [
      { name: 'Law of Contract - II', order: 1, expectedUnits: 8, hasPrescribedCases: true },
      { name: 'Criminology and Penology', order: 2, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Procedural Law - II', order: 3, expectedUnits: 5, hasPrescribedCases: true },
      { name: 'Company Law and Governance', order: 4, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'International Institutions', order: 5, expectedUnits: 5 },
      { name: 'Legal Research Methodology', order: 6, expectedUnits: 6 },
      { name: 'Juvenile Delinquency', order: 7, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'Election Law', order: 8, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Securities Law', order: 9, expectedUnits: 11, hasPrescribedCases: true },
      { name: 'International Air and Space Law', order: 10, expectedUnits: 8 },
    ],
  },
  {
    order: 6,
    name: '6th Semester',
    subjects: [
      { name: 'Corporate Law and Management', order: 1, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'Intellectual Property Law', order: 2, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Human Rights Law', order: 3, expectedUnits: 7 },
      { name: 'Interpretation of Law', order: 4, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Law of Torts and Consumer Protection', order: 5, expectedUnits: 6 },
      { name: 'Seminar - I (Doctrinal)', order: 6 },
      { name: 'Insurance Law', order: 7, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Socio Economic Crime', order: 8, expectedUnits: 5, hasPrescribedCases: true },
      { name: 'International Humanitarian Law', order: 9, expectedUnits: 5 },
      { name: 'Forensic Science', order: 10, expectedUnits: 11, hasPrescribedCases: true },
    ],
  },
  {
    order: 7,
    name: '7th Semester',
    subjects: [
      { name: 'Evidence Law', order: 1, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'International Trade Law', order: 2, expectedUnits: 8 },
      { name: 'Environmental Law', order: 3, expectedUnits: 5, hasPrescribedCases: true },
      { name: 'Clinical Law - I: Alternative Dispute Resolution', order: 4, expectedUnits: 5 },
      { name: 'Administrative Law', order: 5, expectedUnits: 9 },
      { name: 'Labour Law', order: 6, expectedUnits: 9, hasPrescribedCases: true },
      { name: 'Forensic Medicine', order: 7, expectedUnits: 8, hasPrescribedCases: true },
      { name: 'Fiscal Law', order: 8, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'International Refugee Law', order: 9, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Media Law', order: 10, expectedUnits: 8, hasPrescribedCases: true },
    ],
  },
  {
    order: 8,
    name: '8th Semester',
    subjects: [
      { name: 'Law, Poverty and Development', order: 1, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Gender and Inclusive Justice', order: 2, expectedUnits: 5, hasPrescribedCases: true },
      { name: 'Moot Court - I (Civil Case)', order: 3 },
      { name: 'Private International Law', order: 4, expectedUnits: 9, hasPrescribedCases: true },
      { name: 'Cyber Law and Artificial Intelligence', order: 5, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Clinical Law - II (Conveyancing)', order: 6, expectedUnits: 6 },
      { name: 'International Rivers and Sea Law', order: 7, expectedUnits: 11, hasPrescribedCases: true },
      { name: 'Natural Resources Law', order: 8, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'Investment Law', order: 9, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'Business and Human Rights Law', order: 10, expectedUnits: 7 },
    ],
  },
  {
    order: 9,
    name: '9th Semester',
    subjects: [
      { name: 'Moot Court - II (Criminal Case)', order: 1 },
      { name: 'Law of Banking and Negotiable Instruments', order: 2, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Legislative Drafting', order: 3, expectedUnits: 7 },
      { name: 'Taxation Law', order: 4, expectedUnits: 8, hasPrescribedCases: true },
      { name: 'Seminar - II (Non-Doctrinal)', order: 5 },
      { name: 'Energy Law', order: 6, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Victimology', order: 7, expectedUnits: 5, hasPrescribedCases: true },
      { name: 'Population Law', order: 8, expectedUnits: 9, hasPrescribedCases: true },
      { name: 'Competition Law', order: 9, expectedUnits: 8, hasPrescribedCases: true },
    ],
  },
  {
    order: 10,
    name: '10th Semester',
    subjects: [
      { name: 'Clinical Law-III (Placement)', order: 1 },
      { name: 'Social Work and Social Welfare Law', order: 2, expectedUnits: 7, hasPrescribedCases: true },
      { name: 'Professional Ethics and Lawyering Skills', order: 3, expectedUnits: 6, hasPrescribedCases: true },
      { name: 'Dissertation', order: 4 },
    ],
  },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      subjects: {
        include: {
          units: true,
          resources: true,
        },
      },
      resources: true,
    },
  });

  const canonicalSemesters = semesters.filter(s => s.name.includes('Semester'));
  const duplicateSemesters = semesters.filter(s => !s.name.includes('Semester'));
  const outPath = '/home/amrit/.gemini/antigravity/brain/fca871ac-d47f-46b5-b2f0-c594f9d82f46/CURRICULUM_RECONCILIATION_REPORT.md';
  const lines: string[] = [];
  const log = (str: string = '') => {
    lines.push(str);
    console.log(str);
  };

  log('# Authoritative Curriculum Reconciliation Report');
  log('');
  log('> **Purpose**: Comprehensive pre-execution reconciliation between the client’s definitive 10-semester syllabus and the current database state.');
  log('');
  log('## 1. Semesters Overview');
  log('');
  log('| Order | Semester Name | Database ID | Status | Subjects in DB | Direct Resources |');
  log('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const s of canonicalSemesters) {
    log(`| ${s.order} | ${s.name} | \`${s.id}\` | Canonical | ${s.subjects.length} | ${s.resources.length} |`);
  }
  for (const s of duplicateSemesters) {
    log(`| ${s.order} | ${s.name} | \`${s.id}\` | **Duplicate / Legacy** | ${s.subjects.length} | ${s.resources.length} |`);
  }
  log('');

  log('## 2. Detailed Semester-by-Semester Reconciliation');
  log('');

  let totalExpectedSubjects = 0;
  let totalMatchedExact = 0;
  let totalMatchedNameMismatch = 0;
  let totalLegacySubjects = 0;

  for (const expSem of AUTHORITATIVE_CURRICULUM) {
    const dbSem = canonicalSemesters.find(s => s.order === expSem.order);
    log(`### Semester ${expSem.order}: ${expSem.name}`);
    log(`- **Database Semester ID**: \`${dbSem?.id || 'NOT FOUND'}\``);
    log(`- **Expected Subjects Count**: ${expSem.subjects.length}`);
    log('');

    if (!dbSem) {
      log(`❌ **Error**: Semester ${expSem.order} not found in database.`);
      continue;
    }

    log('#### Authoritative Subjects');
    log('');
    log('| # | Expected Subject Name | DB Match Name | DB Subject ID | Status | Units | Resources |');
    log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

    const matchedDbSubjectIds = new Set<string>();

    for (const expSub of expSem.subjects) {
      totalExpectedSubjects++;
      const expNorm = normalize(expSub.name);
      
      let match = dbSem.subjects.find(s => s.name === expSub.name);
      let isExact = !!match;

      if (!match) {
        match = dbSem.subjects.find(s => normalize(s.name) === expNorm);
      }
      if (!match) {
        match = dbSem.subjects.find(s => normalize(s.name).startsWith(expNorm) || expNorm.startsWith(normalize(s.name)));
      }

      if (match) {
        matchedDbSubjectIds.add(match.id);
        if (isExact) {
          totalMatchedExact++;
        } else {
          totalMatchedNameMismatch++;
        }
        const statusStr = isExact ? '✅ Exact Match' : `⚠️ Name Mismatch (DB: "${match.name}")`;
        log(`| ${expSub.order} | **${expSub.name}** | ${match.name} | \`${match.id}\` | ${statusStr} | ${match.units.length} | ${match.resources.length} |`);
      } else {
        log(`| ${expSub.order} | **${expSub.name}** | *None* | *None* | ❌ Missing | 0 | 0 |`);
      }
    }

    const legacySubjects = dbSem.subjects.filter(s => !matchedDbSubjectIds.has(s.id));
    totalLegacySubjects += legacySubjects.length;

    log('');
    log(`#### Legacy / Extra Subjects in DB (${legacySubjects.length})`);
    log('');
    if (legacySubjects.length === 0) {
      log('*None*');
    } else {
      log('| DB Subject Name | DB Subject ID | Order | Units | Resources | Recommendation |');
      log('| :--- | :--- | :--- | :--- | :--- | :--- |');
      for (const leg of legacySubjects) {
        const action = leg.resources.length > 0 ? 'Archive (Has Resources)' : (leg.units.length > 0 ? 'Archive (Has Units)' : 'Safe to Prune / Exclude');
        log(`| ${leg.name} | \`${leg.id}\` | ${leg.order} | ${leg.units.length} | ${leg.resources.length} | ${action} |`);
      }
    }
    log('');
  }

  log('## 3. Reconciliation Summary');
  log('');
  log(`- **Total Canonical Semesters**: 10`);
  log(`- **Duplicate Semesters Identified**: ${duplicateSemesters.length} (\`S1\`)`);
  log(`- **Total Authoritative Subjects Expected**: ${totalExpectedSubjects}`);
  log(`- **Exact Name Matches**: ${totalMatchedExact}`);
  log(`- **Name Normalization Adjustments Needed**: ${totalMatchedNameMismatch}`);
  log(`- **Legacy / Extra Subjects Identified in DB**: ${totalLegacySubjects}`);
  log('');

  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`\nReport successfully written to ${outPath}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
