import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG, normalizeSubjectName } from '../src/lib/syllabus-config';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function matchCanonicals() {
  const [subjects, semesters] = await Promise.all([
    prisma.subject.findMany({
      include: {
        semester: true,
        units: { orderBy: { order: 'asc' } },
        _count: { select: { resources: true } }
      },
      orderBy: [{ semester: { order: 'asc' } }, { order: 'asc' }]
    }),
    prisma.semester.findMany({ orderBy: { order: 'asc' } })
  ]);

  console.log(`Total DB subjects: ${subjects.length}`);

  // Find exact/best match for each syllabus subject
  const canonicalDbIds = new Set<string>();
  const syllabusMatches: any[] = [];
  const missingInDb: any[] = [];

  for (const semConfig of SYLLABUS_CONFIG) {
    const sem = semesters.find(s => s.order === semConfig.order);
    if (!sem) {
      console.log(`Semester order ${semConfig.order} missing!`);
      continue;
    }

    const semSubs = subjects.filter(s => s.semesterId === sem.id);

    for (const authSub of semConfig.subjects) {
      const authNorm = normalizeSubjectName(authSub.name);
      
      // Look for candidate matches in this semester
      const matches = semSubs.filter(s => {
        const sNorm = normalizeSubjectName(s.name);
        return s.name === authSub.name ||
               sNorm === authNorm ||
               s.name.includes(authSub.name) ||
               authSub.name.includes(s.name) ||
               sNorm.startsWith(authNorm) ||
               authNorm.startsWith(sNorm);
      });

      if (matches.length === 0) {
        missingInDb.push({ sem: semConfig.order, authSub: authSub.name });
      } else if (matches.length === 1) {
        canonicalDbIds.add(matches[0].id);
        syllabusMatches.push({
          sem: semConfig.order,
          authSub: authSub.name,
          dbSub: matches[0].name,
          dbId: matches[0].id,
          units: matches[0].units.length,
          resCount: matches[0]._count.resources
        });
      } else {
        // Multiple matches! Pick the one with units or canonical slug
        // Sort: has units first, has slug first
        const sorted = [...matches].sort((a, b) => {
          if (b.units.length !== a.units.length) return b.units.length - a.units.length;
          if (b.slug && !a.slug) return 1;
          if (!b.slug && a.slug) return -1;
          return 0;
        });
        const chosen = sorted[0];
        canonicalDbIds.add(chosen.id);
        syllabusMatches.push({
          sem: semConfig.order,
          authSub: authSub.name,
          dbSub: chosen.name,
          dbId: chosen.id,
          units: chosen.units.length,
          resCount: chosen._count.resources,
          otherMatches: sorted.slice(1).map(m => ({ id: m.id, name: m.name, units: m.units.length, resCount: m._count.resources }))
        });
      }
    }
  }

  console.log(`\nMatched Canonicals count: ${canonicalDbIds.size} / 83`);
  if (missingInDb.length > 0) {
    console.log(`Missing canonicals in DB:`, missingInDb);
  }

  const legacySubjects = subjects.filter(s => !canonicalDbIds.has(s.id));
  console.log(`\nNon-Canonical (Legacy/Duplicate) Subjects count: ${legacySubjects.length}`);
  for (const leg of legacySubjects) {
    console.log(`- [Sem ${leg.semester.order}] "${leg.name}" (ID: ${leg.id}, slug: ${leg.slug}) -> ${leg._count.resources} resources, ${leg.units.length} units`);
  }
}

matchCanonicals().catch(console.error).finally(() => prisma.$disconnect());
