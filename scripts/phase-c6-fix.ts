import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase C.6 Sitaram Kedia Correction...');

  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('main') || dbUrl.includes('prod')) {
    console.error('ABORT: DATABASE_URL points to production!');
    process.exit(1);
  }
  
  const resourceId = '63d46554-9e46-522a-a5b4-d8041c35b816';
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { subject: true }
  });

  if (!resource || !resource.title.includes('Sitaram Kedia')) {
    console.error('ABORT: Resource not found or title mismatch');
    process.exit(1);
  }

  const targetSubject = await prisma.subject.findFirst({
    where: { name: 'Law of Contract-II' }
  });

  if (!targetSubject) {
    console.error('ABORT: Target subject not found');
    process.exit(1);
  }

  console.log(`Current Subject: ${resource.subject?.name}`);
  console.log(`Target Subject: ${targetSubject.name}`);

  await prisma.resource.update({
    where: { id: resourceId },
    data: { subjectId: targetSubject.id }
  });

  const updated = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { subject: true }
  });

  console.log(`Updated Subject: ${updated?.subject?.name}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
