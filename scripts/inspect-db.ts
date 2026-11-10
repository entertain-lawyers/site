import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  const familyLaw = await prisma.subject.findFirst({
    where: { name: { contains: 'Family Law', mode: 'insensitive' }, semester: { order: 4 } },
    include: { resources: { include: { unit: true } } }
  });
  console.log('Family Law subject in DB:', familyLaw?.id, familyLaw?.name);
  console.log('Total resources under Family Law in DB:', familyLaw?.resources.length);

  const units = await prisma.unit.findMany({
    where: { subjectId: familyLaw?.id },
    include: { resources: true }
  });
  console.log('Units for Family Law:', units.map(u => ({ id: u.id, name: u.name, resCount: u.resources.length })));
  
  const allRes = await prisma.resource.count();
  console.log('Total resources in DB:', allRes);

  const allSubjects = await prisma.subject.findMany({
    where: { semester: { order: 4 } },
    include: { _count: { select: { resources: true } } }
  });
  console.log('Sem 4 subjects in DB:', allSubjects.map(s => ({ name: s.name, resCount: s._count.resources })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
