import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  const statuses = await prisma.resource.groupBy({
    by: ['status'],
    _count: { status: true }
  });
  console.log('Resource counts by status in DB:', statuses);

  const familyLaw = await prisma.subject.findFirst({
    where: { name: { contains: 'Family Law', mode: 'insensitive' }, semester: { order: 4 } },
    include: {
      resources: { select: { id: true, title: true, status: true, unitId: true } },
      units: { include: { resources: { select: { id: true, title: true, status: true } } } }
    }
  });

  console.log('Family Law subject direct resources:', familyLaw?.resources.map(r => ({ title: r.title, status: r.status })));
  console.log('Family Law units:');
  familyLaw?.units.forEach(u => {
    console.log(`  Unit "${u.name}": ${u.resources.length} resources`);
    const statusCounts = u.resources.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`    Status breakdown:`, statusCounts);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
