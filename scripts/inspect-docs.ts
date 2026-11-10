import { PrismaClient } from '@prisma/client';
const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function inspectDocuments() {
  const docs = await prisma.document.findMany({
    include: {
      resource: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          subject: { select: { name: true, semester: { select: { order: true } } } }
        }
      },
      Publication: {
        select: { id: true, title: true }
      }
    }
  });

  console.log(`Documents count: ${docs.length}`);
  for (const d of docs) {
    console.log(`- ID: ${d.id}`);
    console.log(`  Provider: ${d.storageProvider} | Size: ${d.fileSize} | Mime: ${d.mimeType}`);
    console.log(`  Key: ${d.storageKey}`);
    if (d.resource) {
      console.log(`  Attached to Resource: [${d.resource.type}] "${d.resource.title}" (Sub: ${d.resource.subject?.name ?? 'null'}, Sem: ${d.resource.subject?.semester?.order ?? 'null'})`);
    } else if (d.Publication) {
      console.log(`  Attached to Publication: "${d.Publication.title}"`);
    } else {
      console.log(`  ORPHANED DOCUMENT`);
    }
  }
}

inspectDocuments().catch(console.error).finally(() => prisma.$disconnect());
