import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed semesters, subjects, and units based on the actual Entertain Lawyers website
 * BA.LLB program structure (10 semesters)
 * 
 * Unit data confirmed by scraping the live site meta descriptions.
 */
async function main() {
  console.log('Seeding semesters, subjects, and units...');

  // Units confirmed from the live Entertain Lawyers website
  const unitsMap: Record<string, { name: string; title?: string }[]> = {
    'Criminal Law-I': [
      { name: 'Unit 1' }, { name: 'Unit 2' }, { name: 'Unit 3' },
      { name: 'Unit 4' }, { name: 'Unit 5' }, { name: 'Unit 6' },
      { name: 'Unit 7' }, { name: 'Prescribed Cases' },
    ],
    'Criminal Law-II': [
      { name: 'Unit 1' }, { name: 'Unit 2' }, { name: 'Unit 3' },
      { name: 'Unit 4' }, { name: 'Unit 5' }, { name: 'Unit 6' },
      { name: 'Prescribed Cases' },
    ],
    'Property Law': [
      { name: 'Unit 1' }, { name: 'Unit 2' }, { name: 'Unit 3' },
      { name: 'Unit 4' }, { name: 'Unit 5' }, { name: 'Unit 6' },
      { name: 'Unit 7' }, { name: 'Unit 8' }, { name: 'Unit 9' },
      { name: 'Unit 10' }, { name: 'Unit 11' }, { name: 'Unit 12' },
      { name: 'Unit 13' }, { name: 'Prescribed Case' },
    ],
  };

  const semesters = [
    {
      name: '1st Semester', order: 1,
      subjects: ['English-I', 'Sociology', 'Political Science-I', 'Economics-I', 'Legal Methods'],
    },
    {
      name: '2nd Semester', order: 2,
      subjects: ['English-II', 'Nepali', 'Political Science-II', 'Economics-II', 'Introduction to Law and Legal System'],
    },
    {
      name: '3rd Semester', order: 3,
      subjects: ['Constitutional Law-I', 'Law of Contract-I', 'Law of Tort', 'Criminal Law-I', 'Family Law-I'],
    },
    {
      name: '4th Semester', order: 4,
      subjects: ['Constitutional Law-II', 'Law of Contract-II', 'Criminal Law-II', 'Family Law-II', 'Property Law'],
    },
    {
      name: '5th Semester', order: 5,
      subjects: ['Administrative Law', 'Company Law', 'Labor Law', 'Law of Evidence', 'Jurisprudence-I'],
    },
    {
      name: '6th Semester', order: 6,
      subjects: ['Civil Procedure', 'Criminal Procedure', 'Jurisprudence-II', 'Taxation Law', 'Environmental Law'],
    },
    {
      name: '7th Semester', order: 7,
      subjects: ['International Law', 'Human Rights Law', 'Banking and Insurance Law', 'Intellectual Property Law', 'Cyber Law'],
    },
    {
      name: '8th Semester', order: 8,
      subjects: ['Land Law and Land Reform', 'Alternative Dispute Resolution', 'Legal Drafting and Conveyancing', 'Legal Aid and Public Interest Litigation', 'Comparative Constitutional Law'],
    },
    {
      name: '9th Semester', order: 9,
      subjects: ['Professional Ethics', 'Clinical Legal Education', 'Elective-I', 'Elective-II', 'Research Methodology'],
    },
    {
      name: '10th Semester', order: 10,
      subjects: ['Moot Court', 'Internship', 'Dissertation', 'Elective-III', 'Elective-IV'],
    },
  ];

  for (const sem of semesters) {
    const existing = await prisma.semester.findFirst({ where: { name: sem.name } });
    if (existing) {
      console.log(`Semester "${sem.name}" already exists, checking units...`);

      // Still seed units for existing semesters if they don't have them yet
      const subjects = await prisma.subject.findMany({ where: { semesterId: existing.id } });
      for (const subject of subjects) {
        const units = unitsMap[subject.name];
        if (units) {
          const existingUnits = await prisma.unit.count({ where: { subjectId: subject.id } });
          if (existingUnits === 0) {
            for (let i = 0; i < units.length; i++) {
              await prisma.unit.create({
                data: {
                  name: units[i].name,
                  title: units[i].title || null,
                  order: i + 1,
                  subjectId: subject.id,
                },
              });
            }
            console.log(`  Added ${units.length} units to "${subject.name}"`);
          }
        }
      }
      continue;
    }

    const semester = await prisma.semester.create({
      data: { name: sem.name, order: sem.order },
    });

    for (const subjectName of sem.subjects) {
      const subject = await prisma.subject.create({
        data: { name: subjectName, semesterId: semester.id },
      });

      const units = unitsMap[subjectName];
      if (units) {
        for (let i = 0; i < units.length; i++) {
          await prisma.unit.create({
            data: {
              name: units[i].name,
              title: units[i].title || null,
              order: i + 1,
              subjectId: subject.id,
            },
          });
        }
        console.log(`  Added ${units.length} units to "${subjectName}"`);
      }
    }

    console.log(`Created ${sem.name} with ${sem.subjects.length} subjects`);
  }

  // Create default subscription plans if none exist
  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await prisma.plan.create({
      data: { name: 'Monthly Access', durationDays: 30, priceAmount: 29900, currency: 'NPR', isActive: true },
    });
    await prisma.plan.create({
      data: { name: 'Semester Access', durationDays: 180, priceAmount: 149900, currency: 'NPR', isActive: true },
    });
    console.log('Created default subscription plans');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
