import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG } from '../src/lib/syllabus-config';

const prisma = new PrismaClient();

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('--- Phase E.3 Syllabus Execution ---');

  const existingSubjects = await prisma.subject.findMany();
  let createdSemesters = 0;
  let linkedSubjects = 0;
  let createdSubjects = 0;

  for (const semConfig of SYLLABUS_CONFIG) {
    // Upsert Semester
    const semester = await prisma.semester.upsert({
      where: { slug: normalize(semConfig.name) },
      update: { name: semConfig.name, order: semConfig.order },
      create: { name: semConfig.name, order: semConfig.order, slug: normalize(semConfig.name) }
    });
    createdSemesters++;

    for (const subConfig of semConfig.subjects) {
      // Find exact or normalized
      const exactMatch = existingSubjects.find(s => s.name.toLowerCase() === subConfig.name.toLowerCase());
      const normName = normalize(subConfig.name);
      const normMatches = existingSubjects.filter(s => normalize(s.name) === normName);
      
      let targetSubjectId: string | undefined;

      if (exactMatch) {
        targetSubjectId = exactMatch.id;
      } else if (normMatches.length === 1) {
        targetSubjectId = normMatches[0].id;
      }

      if (targetSubjectId) {
        // Update the existing subject to belong to this semester and have the new order/name.
        // We only update order and semesterId so we don't break old references. We DO NOT rename old subjects as per rules.
        await prisma.subject.update({
          where: { id: targetSubjectId },
          data: { semesterId: semester.id, order: subConfig.order }
        });
        linkedSubjects++;
      } else {
        // Create new subject
        await prisma.subject.create({
          data: {
            name: subConfig.name,
            semesterId: semester.id,
            order: subConfig.order,
            slug: normalize(semConfig.name + '-' + subConfig.name)
          }
        });
        createdSubjects++;
      }
    }
  }

  console.log(`\nExecution Summary:`);
  console.log(`Semesters Processed/Upserted: ${createdSemesters}`);
  console.log(`Existing Subjects Linked: ${linkedSubjects}`);
  console.log(`New Subjects Created: ${createdSubjects}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
