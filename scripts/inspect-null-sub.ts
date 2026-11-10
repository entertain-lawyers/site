import { PrismaClient } from '@prisma/client';
const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function inspectNullSubjects() {
  const nullSubResources = await prisma.resource.findMany({
    where: { subjectId: null },
    select: { id: true, title: true, type: true, status: true, semesterId: true, semester: { select: { name: true, order: true } } }
  });

  console.log(`Resources with subjectId === null: ${nullSubResources.length}`);
  const typeCounts: Record<string, number> = {};
  for (const r of nullSubResources) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }
  console.log('Types of null-subject resources:', typeCounts);

  console.log('\nAll null-subject resources:');
  for (const r of nullSubResources) {
    console.log(`- [${r.type}] [${r.status}] "${r.title}" (id: ${r.id}, sem: ${r.semester?.name ?? 'none'})`);
  }
}

inspectNullSubjects().catch(console.error).finally(() => prisma.$disconnect());
