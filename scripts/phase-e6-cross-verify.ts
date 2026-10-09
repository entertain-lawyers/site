import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

const clientSyllabus = {
  1: [
    { name: "Legal Method", units: "Unit 1 - 5" },
    { name: "Legal Nepali -I", units: "Unit 1 - 2" },
    { name: "Alternative English (for Foreigners in Lieu of Legal Nepali) (Semester 1)", units: "Unit 1-5" }, // Note: Adjusted for our recent rename
    { name: "Legal English – I", units: "Unit 1-6" },
    { name: "Political Theory", units: "Unit 1-7" },
    { name: "Nepali History", units: "Unit 1-5" },
    { name: "Sociology", units: "Unit 1-7" },
    { name: "Economics - I", units: "Unit 1-5" },
  ],
  2: [
    { name: "Jurisprudence - I", units: "Unit 1-5" },
    { name: "Legal Nepali – II", units: "Unit 1-3" },
    { name: "Alternative English (for Foreigners in Lieu of Legal Nepali) (Semester 2)", units: "Unit 1-2" },
    { name: "Legal English – II", units: "Unit 1-6" },
    { name: "Political Thoughts", units: "Unit 1-5" },
    { name: "Global History", units: "Unit 1-5" },
    { name: "Anthropology", units: "Unit 1-9" },
    { name: "Economics – II", units: "Unit 1-6" },
  ],
  3: [
    { name: "Jurisprudence – II", units: "Unit 1-7" },
    { name: "Constitutional Law – I", units: "Unit 1-6" },
    { name: "International Relations and Diplomacy", units: "Unit 1-7" },
    { name: "Criminal Law - I", units: "Unit 1-7, Prescribed Cases" },
    { name: "Public International Law – I", units: "Unit 1-9" },
    { name: "Property Law", units: "Unit 1-13, Prescribed Cases (Old Syllabus & New Syllabus)" },
    { name: "Comparative Law", units: "Unit 1-7" },
  ],
  4: [
    { name: "Criminal Law - II", units: "Unit 1-6,Prescribed Cases" },
    { name: "Public International Law - II", units: "Unit 1-8" },
    { name: "Constitutional Law - II", units: "Unit 1-7" },
    { name: "Family Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Law of Contract - I", units: "Unit 1-8,Prescribed Cases" },
    { name: "Procedural Law - I", units: "Unit 1-5, Prescribed Cases" },
    { name: "Nepali Legal System", units: "Unit 1-5" },
  ],
  5: [
    { name: "Law of Contract - II", units: "Unit 1-8,Prescribed Cases" },
    { name: "Criminology and Penology", units: "Unit 1-7,Prescribed Cases" },
    { name: "Procedural Law - II", units: "Unit 1-5,Prescribed Cases" },
    { name: "Company Law and Governance", units: "Unit 1-6,Prescribed Cases" },
    { name: "International Institutions", units: "Unit 1-5" },
    { name: "Legal Research Methodology", units: "Unit 1-6" },
    { name: "Juvenile Delinquency", units: "Unit 1-6,Prescribed Cases" },
    { name: "Election Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Securities Law", units: "Unit 1-11,Prescribed Cases" },
    { name: "International Air and Space Law", units: "Unit 1-8" },
  ],
  6: [
    { name: "Corporate Law and Management", units: "Unit 1-6 , Prescribed Cases" },
    { name: "Intellectual Property Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Human Rights Law", units: "Unit 1-7" },
    { name: "Interpretation of Law", units: "Unit 1-7 , Prescribed Cases" },
    { name: "Law of Torts and Consumer Protection", units: "Unit 1-6" },
    { name: "Seminar - I (Doctrinal)", units: "" },
    { name: "Insurance Law", units: "Unit 1-7, Prescribed Cases" },
    { name: "Socio Economic Crime", units: "Unit 1-5,Prescribed Cases" },
    { name: "International Humanitarian Law", units: "Unit 1-5" },
    { name: "Forensic Science", units: "Unit 1-11,Prescribed Cases" },
  ],
  7: [
    { name: "Evidence Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "International Trade Law", units: "Unit 1-8" },
    { name: "Environmental Law", units: "Unit 1-5,Prescribed Cases" },
    { name: "Clinical Law -1:Alternative Dispute Resolution", units: "Unit 1-5" }, // Noted difference: DB has "Clinical Law - I: Alternative Dispute Resolution"
    { name: "Administrative Law", units: "Unit 1-9" },
    { name: "Labour Law", units: "Unit 1-9,Prescribed Cases" },
    { name: "Forensic Medicine", units: "Unit 1-8,Prescribed Cases" },
    { name: "Fiscal Law", units: "Unit 1-6,Prescribed Cases" },
    { name: "International Refugee Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Media Law", units: "Unit 1-8,Prescribed Cases" },
  ],
  8: [
    { name: "Law, Poverty and Development", units: "Unit 1-7,Prescribed Cases" },
    { name: "Gender and Inclusive Justice", units: "Unit 1-5,Prescribed Cases" },
    { name: "Moot Court - I (Civil Case)", units: "" },
    { name: "Private International Law", units: "Unit 1-9,Prescribed Cases" },
    { name: "Cyber Law and Artificial Intelligence", units: "Unit 1-7,Prescribed Cases" },
    { name: "Clinical Law - II (Conveyancing)", units: "Unit 1-6" },
    { name: "International Rivers and Sea Law", units: "Unit 1-11,Prescribed Cases" },
    { name: "Natural Resources Law", units: "Unit 1-6,Prescribed Cases" },
    { name: "Investment Law", units: "Unit 1-6,Prescribed Cases" },
    { name: "Business and Human Rights Law", units: "Unit 1-7" },
  ],
  9: [
    { name: "Moot Court - II (Criminal Case)", units: "" },
    { name: "Law of Banking and Negotiable Instruments", units: "Unit 1-7,Prescribed Cases" },
    { name: "Legislative Drafting", units: "Unit 1-7" },
    { name: "Taxation Law", units: "Unit 1-8,Prescribed Cases" },
    { name: "Seminar - II (Non-Doctrinal)", units: "" },
    { name: "Energy Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Victimology", units: "Unit 1-5,Prescribed Cases" },
    { name: "Population Law", units: "Unit 1-9,Prescribed Cases" },
    { name: "Competition Law", units: "Unit 1-8,Prescribed Cases" },
  ],
  10: [
    { name: "Clinical Law-III (Placement)", units: "" }, // DB: Clinical Law - III (Placement)
    { name: "Social Work and Social Welfare Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Professional Ethics and Lawyering Skills", units: "Unit 1-6,Prescribed Cases" },
    { name: "Dissertation", units: "" },
  ]
};

function normalizeString(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  const semesters = await prisma.semester.findMany({
    include: {
      subjects: {
        include: {
          units: true
        }
      }
    },
    orderBy: { order: "asc" }
  });

  const report: string[] = [];
  report.push("# Client Syllabus Verification Report\n");

  for (let order = 1; order <= 10; order++) {
    report.push(`## Semester ${order}`);
    const expectedSubjects = clientSyllabus[order as keyof typeof clientSyllabus];
    const actualSem = semesters.find(s => s.order === order);
    
    if (!actualSem) {
      report.push(`- ❌ **MISSING SEMESTER IN DB**`);
      continue;
    }

    const actualSubjects = actualSem.subjects;
    
    // Check missing expected subjects
    for (const exp of expectedSubjects) {
      const normExp = normalizeString(exp.name);
      const match = actualSubjects.find(a => normalizeString(a.name) === normExp);
      
      if (!match) {
        report.push(`- ❌ **MISSING SUBJECT:** ${exp.name}`);
      } else {
        let msg = `- ✅ ${match.name}`;
        if (match.name !== exp.name) {
          msg += ` *(Client text: "${exp.name}")*`;
        }
        
        // Verify units roughly (count)
        if (exp.units) {
          const matchUnits = exp.units.match(/Unit 1\s*-\s*(\d+)/i);
          const needsCases = exp.units.toLowerCase().includes("prescribed cases");
          
          let unitNotes = [];
          if (matchUnits) {
            const expectedCount = parseInt(matchUnits[1], 10);
            const actualUnitCount = match.units.filter(u => u.name.toLowerCase().startsWith("unit")).length;
            if (actualUnitCount < expectedCount) {
              unitNotes.push(`⚠️ Missing units (Has ${actualUnitCount}, Expected ${expectedCount})`);
            }
          }
          if (needsCases) {
            const hasCases = match.units.some(u => u.name.toLowerCase().includes("prescribed cases") || u.title?.toLowerCase().includes("prescribed cases"));
            if (!hasCases) {
              unitNotes.push(`⚠️ Missing 'Prescribed Cases' unit`);
            }
          }
          if (unitNotes.length > 0) {
            msg += `\n  - ${unitNotes.join(', ')}`;
          }
        }
        report.push(msg);
      }
    }

    // Check extra subjects in DB
    for (const act of actualSubjects) {
      const normAct = normalizeString(act.name);
      const match = expectedSubjects.find(e => normalizeString(e.name) === normAct);
      if (!match) {
        report.push(`- ⚠️ **EXTRA SUBJECT IN DB:** ${act.name}`);
      }
    }
    
    report.push("");
  }

  fs.writeFileSync("SYLLABUS_VERIFICATION.md", report.join("\n"));
  console.log("Verification saved to SYLLABUS_VERIFICATION.md");
}

main().catch(console.error).finally(() => prisma.$disconnect());
