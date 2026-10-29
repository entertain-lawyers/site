import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEMESTERS ===');
  const semesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { subjects: true, resources: true },
      },
    },
  });

  for (const s of semesters) {
    console.log(`ID: ${s.id} | Order: ${s.order} | Name: "${s.name}" | Slug: "${s.slug}" | Subjects: ${s._count.subjects} | Direct Resources: ${s._count.resources}`);
  }

  console.log('\n=== SUBJECTS ===');
  const subjects = await prisma.subject.findMany({
    orderBy: [
      { semester: { order: 'asc' } },
      { order: 'asc' },
      { name: 'asc' },
    ],
    include: {
      semester: { select: { id: true, name: true, order: true } },
      _count: {
        select: { units: true, resources: true },
      },
    },
  });

  console.log(`Total subjects in DB: ${subjects.length}`);
  for (const sub of subjects) {
    console.log(`ID: ${sub.id} | Sem [${sub.semester?.order}] "${sub.semester?.name}" | Order: ${sub.order} | Name: "${sub.name}" | Slug: "${sub.slug}" | Units: ${sub._count.units} | Res: ${sub._count.resources}`);
  }

  console.log('\n=== RESOURCES WITH ATTACHMENTS ===');
  const resources = await prisma.resource.findMany({
    include: {
      subject: { select: { id: true, name: true } },
      semester: { select: { id: true, name: true } },
      document: { select: { id: true, storageKey: true, mimeType: true } },
    },
  });
  console.log(`Total resources in DB: ${resources.length}`);
  for (const r of resources) {
    console.log(`ID: ${r.id} | Title: "${r.title}" | Type: ${r.type} | Sem: "${r.semester?.name}" | Sub: "${r.subject?.name}" | Doc: ${r.document?.storageKey || 'NONE'}`);
  }
}

main()
  .catch((e) => {
    console.error('Inspection error:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
