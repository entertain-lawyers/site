import { PrismaClient } from '@prisma/client';
const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function inspectDuplicates() {
  const all = await prisma.resource.findMany({
    include: {
      document: true,
      subject: true,
      semester: true,
    }
  });

  const byTitle = new Map<string, typeof all>();
  for (const r of all) {
    const key = r.title.trim().toLowerCase();
    const list = byTitle.get(key) || [];
    list.push(r);
    byTitle.set(key, list);
  }

  console.log(`Unique titles: ${byTitle.size} out of ${all.length} resources`);
  for (const [title, list] of byTitle.entries()) {
    if (list.length > 1) {
      console.log(`\nDuplicate Title (${list.length} copies): "${title}"`);
      for (const item of list) {
        console.log(`  - ID: ${item.id} | Type: ${item.type} | Status: ${item.status} | Sub: ${item.subject?.name ?? 'null'} | Sem: ${item.semester?.name ?? 'null'} | Doc: ${item.document ? `${item.document.storageProvider}:${item.document.storageKey}` : 'null'} | ContentLen: ${item.content?.length ?? 0}`);
      }
    }
  }
}

inspectDuplicates().catch(console.error).finally(() => prisma.$disconnect());
