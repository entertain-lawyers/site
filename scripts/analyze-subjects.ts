import { PrismaClient } from '@prisma/client';
const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function analyzeSubjects() {
  const subjectsToInspect = [
    'Family Law', 'Family Law-II',
    'Law of Contract-I', 'Law of Contract-II',
    'Company Law', 'Company Law and Governance',
    'Labor Law', 'Labour Law',
    'Law of Evidence', 'Evidence Law',
    'Banking and Insurance Law', 'Insurance Law', 'Law of Banking and Negotiable Instruments',
    'Nepali', 'Legal Nepali - I', 'Legal Nepali - II',
    'Criminal Procedure', 'Procedural Law - I', 'Procedural Law - II',
    'International Law', 'Public International Law - I', 'Public International Law - II', 'Private International Law',
    'Moot Court', 'Moot Court - I (Civil Case)', 'Moot Court - II (Criminal Case)'
  ];

  const subjects = await prisma.subject.findMany({
    where: { name: { in: subjectsToInspect } },
    include: {
      semester: true,
      units: { orderBy: { order: 'asc' }, include: { _count: { select: { resources: true } } } },
      resources: {
        select: { id: true, title: true, type: true, status: true, unitId: true, semesterId: true }
      }
    },
    orderBy: [{ semester: { order: 'asc' } }, { order: 'asc' }]
  });

  for (const s of subjects) {
    console.log(`\n=== [Sem ${s.semester.order}] "${s.name}" (ID: ${s.id}, slug: ${s.slug}) ===`);
    console.log(`Units (${s.units.length}): ${s.units.map(u => `${u.name} [order ${u.order}, res: ${u._count.resources}]`).join(', ')}`);
    console.log(`Total Resources: ${s.resources.length}`);
    const byType: Record<string, number> = {};
    for (const r of s.resources) byType[r.type] = (byType[r.type] || 0) + 1;
    console.log(`By Type:`, byType);
    
    // Sample titles
    for (const r of s.resources.slice(0, 5)) {
      console.log(`  - [${r.type}] [unit: ${r.unitId ? 'YES' : 'NONE'}] "${r.title}"`);
    }
    if (s.resources.length > 5) {
      console.log(`  ... and ${s.resources.length - 5} more`);
    }
  }
}

analyzeSubjects().catch(console.error).finally(() => prisma.$disconnect());
