import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgresql://neondb_owner:npg_t0BgZCO7ibaL@ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const BASE_URL = 'https://entertainlawyers.vercel.app';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProductionVerifier/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return await res.text();
}

async function verifyProduction() {
  console.log(`\n======================================================`);
  console.log(`  POST-REPAIR PRODUCTION VERIFICATION`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const semesters = await prisma.semester.findMany({ orderBy: { order: 'asc' } });

  console.log(`Found ${semesters.length} semesters in DB to verify on production.\n`);

  const results: Array<{
    semesterOrder: number;
    semesterName: string;
    url: string;
    subjectCount: number;
    subjects: Array<{
      name: string;
      resourceCount: number;
      units: Array<{ name: string; resourceCount: number }>;
    }>;
    semesterLevelResourceCount: number;
  }> = [];

  for (const sem of semesters) {
    const semUrl = `${BASE_URL}/semesters/${sem.id}`;
    process.stdout.write(`Fetching Semester ${sem.order}: ${sem.name} (${semUrl})... `);
    const html = await fetchHtml(semUrl);
    const $ = cheerio.load(html);

    // Each subject is in a section
    const subjects: Array<{
      name: string;
      resourceCount: number;
      units: Array<{ name: string; resourceCount: number }>;
    }> = [];

    // Check all section headings
    $('section').each((_, sec) => {
      const $sec = $(sec);
      const subHeading = $sec.find('h2').first().text().trim();
      if (!subHeading) return;

      // Check if this section is the "Old Questions & Resources" semester-level section or a subject
      const isSemesterSection = subHeading.toLowerCase().includes('old question');

      if (!isSemesterSection) {
        // Collect units
        const units: Array<{ name: string; resourceCount: number }> = [];
        $sec.find('div.border-b').each((__, uDiv) => {
          const $uDiv = $(uDiv);
          const uTitle = $uDiv.find('h3').first().text().trim();
          const resLinks = $uDiv.find('a[href^="/resources/"]');
          if (uTitle) {
            units.push({
              name: uTitle,
              resourceCount: resLinks.length
            });
          }
        });

        // Collect direct resources under subject
        const allResLinks = $sec.find('a[href^="/resources/"]');
        subjects.push({
          name: subHeading,
          resourceCount: allResLinks.length,
          units
        });
      }
    });

    // Check semester-level resources
    const semLevelLinks = $('section').filter((_, sec) => {
      const h2 = $(sec).find('h2').first().text().toLowerCase();
      return h2.includes('old question');
    }).find('a[href^="/resources/"]');

    results.push({
      semesterOrder: sem.order,
      semesterName: sem.name,
      url: semUrl,
      subjectCount: subjects.length,
      subjects,
      semesterLevelResourceCount: semLevelLinks.length
    });

    console.log(`OK (${subjects.length} subjects found)`);
  }

  console.log(`\n--- PRODUCTION AUDIT RESULTS PER SEMESTER ---\n`);

  for (const r of results) {
    console.log(`\n======================================================`);
    console.log(`Semester ${r.semesterOrder}: ${r.semesterName}`);
    console.log(`URL: ${r.url}`);
    console.log(`Visible Subjects: ${r.subjectCount}`);
    if (r.semesterLevelResourceCount > 0) {
      console.log(`Semester-Level Resources (Past Exam Questions): ${r.semesterLevelResourceCount}`);
    }
    console.log(`------------------------------------------------------`);
    for (const sub of r.subjects) {
      console.log(`  * ${sub.name}: ${sub.resourceCount} resources`);
      for (const u of sub.units) {
        if (u.resourceCount > 0) {
          console.log(`      - Unit [${u.name}]: ${u.resourceCount} resources`);
        }
      }
    }
  }

  // Specifically check 4th Semester Family Law
  console.log(`\n======================================================`);
  console.log(`  SPECIFIC CHECK: 4th Semester Family Law`);
  console.log(`======================================================`);
  const sem4 = results.find(r => r.semesterOrder === 4);
  if (!sem4) {
    console.error('ERROR: Semester 4 not found in results!');
  } else {
    const flSubs = sem4.subjects.filter(s => s.name.toLowerCase().includes('family law'));
    console.log(`Family Law subjects visible in 4th Semester: ${flSubs.length}`);
    if (flSubs.length === 1) {
      console.log(`✓ Exactly one Family Law subject found: "${flSubs[0].name}"`);
      console.log(`✓ Total resources in Family Law: ${flSubs[0].resourceCount}`);
      const prescribed = flSubs[0].units.find(u => u.name.toLowerCase().includes('prescribed'));
      if (prescribed) {
        console.log(`✓ Unit "${prescribed.name}" contains ${prescribed.resourceCount} case laws`);
      } else {
        console.log(`⚠ Prescribed Cases unit not found among units!`);
      }
    } else {
      console.error(`FAILED: Expected 1 Family Law subject, found ${flSubs.length}`);
    }
  }
}

verifyProduction().catch(console.error).finally(() => prisma.$disconnect());
