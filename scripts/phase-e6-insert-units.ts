import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clientSyllabus = {
  1: [
    { name: "Legal Method", units: "Unit 1 - 5" },
    { name: "Legal Nepali -I", units: "Unit 1 - 2" },
    { name: "Alternative English (for Foreigners in Lieu of Legal Nepali) (Semester 1)", units: "Unit 1-5" },
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
    { name: "Clinical Law -1:Alternative Dispute Resolution", units: "Unit 1-5" },
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
    { name: "Clinical Law-III (Placement)", units: "" },
    { name: "Social Work and Social Welfare Law", units: "Unit 1-7,Prescribed Cases" },
    { name: "Professional Ethics and Lawyering Skills", units: "Unit 1-6,Prescribed Cases" },
    { name: "Dissertation", units: "" },
  ]
};

function normalizeString(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log("Starting Units Provisioning...");

  let totalInserted = 0;

  await prisma.$transaction(async (tx) => {
    const semesters = await tx.semester.findMany({
      include: { subjects: { include: { units: true } } },
      orderBy: { order: "asc" }
    });

    for (let order = 1; order <= 10; order++) {
      const expectedSubjects = clientSyllabus[order as keyof typeof clientSyllabus];
      const actualSem = semesters.find(s => s.order === order);
      
      if (!actualSem) continue;

      for (const exp of expectedSubjects) {
        if (!exp.units) continue; // No units needed

        const matchUnits = exp.units.match(/Unit 1\s*-\s*(\d+)/i);
        const needsCases = exp.units.toLowerCase().includes("prescribed cases");
        
        let expectedCount = 0;
        if (matchUnits) {
          expectedCount = parseInt(matchUnits[1], 10);
        }

        const normExp = normalizeString(exp.name);
        // Find matching subject in DB (handling the slight typos/variations)
        // If it's Alternative English, we need exact match.
        let match = actualSem.subjects.find(a => normalizeString(a.name) === normExp);
        
        // Special mapping since DB has "Clinical Law - I: Alternative Dispute Resolution" and text has "-1:"
        if (exp.name === "Clinical Law -1:Alternative Dispute Resolution") {
           match = actualSem.subjects.find(a => a.name === "Clinical Law - I: Alternative Dispute Resolution");
        }
        if (exp.name === "Clinical Law-III (Placement)") {
           match = actualSem.subjects.find(a => a.name === "Clinical Law - III (Placement)");
        }

        if (!match) {
          console.log(`WARNING: Could not find DB subject matching "${exp.name}" in Sem ${order}`);
          continue;
        }

        // Generate missing units
        const currentUnits = match.units.length;
        if (currentUnits === 0 && (expectedCount > 0 || needsCases)) {
          const unitsToInsert = [];
          
          // Insert Unit 1 through N
          for (let i = 1; i <= expectedCount; i++) {
            unitsToInsert.push({
              name: `Unit ${i}`,
              order: i,
              subjectId: match.id,
            });
          }

          // Insert Prescribed Cases
          if (needsCases) {
            unitsToInsert.push({
              name: "Prescribed Cases",
              order: expectedCount + 1,
              subjectId: match.id,
            });
          }

          if (unitsToInsert.length > 0) {
            await tx.unit.createMany({
              data: unitsToInsert
            });
            totalInserted += unitsToInsert.length;
            console.log(`Inserted ${unitsToInsert.length} units into subject "${match.name}"`);
          }
        }
      }
    }
  }, {
    maxWait: 15000,
    timeout: 60000
  });

  console.log(`\nSuccessfully inserted ${totalInserted} units!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
