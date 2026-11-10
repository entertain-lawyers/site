import { PrismaClient } from '@prisma/client';
const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function inspectUnits() {
  const subjects = await prisma.subject.findMany({
    where: { slug: { not: null } },
    include: {
      semester: true,
      units: { orderBy: { order: 'asc' } }
    },
    orderBy: [{ semester: { order: 'asc' } }, { order: 'asc' }]
  });

  console.log(`Canonical subjects with slugs: ${subjects.length}`);
  for (const s of subjects) {
    const pUnit = s.units.find(u => u.name.toLowerCase().includes('prescribed') || u.name.toLowerCase().includes('case'));
    console.log(`[Sem ${s.semester.order}] "${s.name}" (units: ${s.units.length}): Prescribed unit = ${pUnit ? `"${pUnit.name}" (id: ${pUnit.id})` : 'NONE'}`);
  }
}

inspectUnits().catch(console.error).finally(() => prisma.$disconnect());
