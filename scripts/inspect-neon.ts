import { PrismaClient } from '@prisma/client';
const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function check() {
  const sem4 = await prisma.semester.findFirst({
    where: { OR: [{ order: 4 }, { name: { contains: '4' } }] },
    include: {
      subjects: {
        include: {
          resources: { select: { id: true, title: true, type: true, documentId: true, status: true, semesterId: true } },
          units: {
            include: {
              resources: { select: { id: true, title: true, type: true, documentId: true, status: true, semesterId: true } }
            }
          }
        }
      }
    }
  });

  console.log('Sem4 name:', sem4?.name, 'id:', sem4?.id);
  console.log('Subjects count in Sem4:', sem4?.subjects.length);
  for (const s of sem4?.subjects || []) {
    const directRes = s.resources.length;
    const unitRes = s.units.reduce((acc, u) => acc + u.resources.length, 0);
    console.log(`- "${s.name}" (id: ${s.id}, order: ${s.order}): direct resources = ${directRes}, units = ${s.units.length}, unit resources = ${unitRes}`);
    if (s.name.toLowerCase().includes('family')) {
      console.log('   -> Full Family Law subject:', JSON.stringify(s, null, 2));
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
