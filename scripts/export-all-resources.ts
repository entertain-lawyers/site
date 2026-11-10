import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function mapAll() {
  const [resources, subjects, semesters] = await Promise.all([
    prisma.resource.findMany({
      include: {
        document: true,
        subject: { include: { semester: true } },
        semester: true,
        unit: true
      },
      orderBy: { title: 'asc' }
    }),
    prisma.subject.findMany({
      include: {
        semester: true,
        units: { orderBy: { order: 'asc' } }
      }
    }),
    prisma.semester.findMany({
      orderBy: { order: 'asc' }
    })
  ]);

  const report: any[] = [];

  for (const r of resources) {
    report.push({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      currentSubjectId: r.subjectId,
      currentSubjectName: r.subject?.name ?? null,
      currentSubjectSemOrder: r.subject?.semester?.order ?? null,
      currentSemesterId: r.semesterId,
      currentUnitId: r.unitId,
      currentUnitName: r.unit?.name ?? null,
      hasDocument: !!r.document,
      docProvider: r.document?.storageProvider ?? null,
      docKey: r.document?.storageKey ?? null,
      contentLength: r.content?.length ?? 0
    });
  }

  fs.writeFileSync('scratch/all_364_resources.json', JSON.stringify(report, null, 2));
  console.log(`Exported ${report.length} resources to scratch/all_364_resources.json`);
}

mapAll().catch(console.error).finally(() => prisma.$disconnect());
