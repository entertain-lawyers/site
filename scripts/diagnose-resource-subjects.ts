import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function getWPCategories(slug: string): Promise<any[]> {
  try {
    const res = await fetch(`https://entertainlawyers.com/wp-json/wp/v2/posts?slug=${slug}`);
    if (!res.ok) throw new Error('Failed to fetch post');
    const posts = await res.json();
    if (!posts || posts.length === 0) return [];
    
    const categoryIds = posts[0].categories;
    if (!categoryIds || categoryIds.length === 0) return [];
    
    const catRes = await fetch(`https://entertainlawyers.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`);
    if (!catRes.ok) throw new Error('Failed to fetch categories');
    
    const categories = await catRes.json();
    return categories; // array of { id, name, slug }
  } catch (error: any) {
    throw new Error(`WP_FETCH_ERROR: ${error.message}`);
  }
}

async function main() {
  console.log('Starting detailed diagnostic script...');
  
  const subjects = await prisma.subject.findMany({ include: { semester: true } });
  
  const mappingFile = path.join(process.cwd(), 'migration-staging-recovered', 'resources.json');
  let titleToSlug = new Map<string, string>();
  if (fs.existsSync(mappingFile)) {
    const records = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
    for (const record of records) {
      if (record.title && record.wordpressSlug) {
        titleToSlug.set(record.title, record.wordpressSlug);
      }
    }
  }

  const resources = await prisma.resource.findMany({ include: { subject: true } });
  
  const report = {
    proposedFixes: [] as any[],
    unchanged: [] as any[],
    diagnostics: {
      MISSING_RESOURCES_JSON: [] as any[],
      WP_POST_NOT_FOUND: [] as any[],
      WP_FETCH_ERROR: [] as any[],
      NO_CATEGORIES_IN_WP: [] as any[],
      NAMING_MISMATCH: [] as any[],
      AMBIGUOUS_MATCH: [] as any[],
    },
    counts: {
      proposedFixes: 0,
      unchanged: 0,
      MISSING_RESOURCES_JSON: 0,
      WP_POST_NOT_FOUND: 0,
      WP_FETCH_ERROR: 0,
      NO_CATEGORIES_IN_WP: 0,
      NAMING_MISMATCH: 0,
      AMBIGUOUS_MATCH: 0,
    }
  };

  let count = 0;
  for (const resource of resources) {
    count++;
    if (count % 10 === 0) console.log(`Processed ${count}/${resources.length}`);
    
    const baseObj = {
      id: resource.id,
      title: resource.title,
      currentSubjectId: resource.subjectId,
      currentSubjectName: resource.subject?.name || null,
      currentSubjectSlug: resource.subject?.slug || null,
    };
    
    const slug = titleToSlug.get(resource.title);
    if (!slug) {
      report.diagnostics.MISSING_RESOURCES_JSON.push({ ...baseObj, reason: 'Missing in resources.json' });
      continue;
    }
    
    let wpCategories: any[];
    try {
      wpCategories = await getWPCategories(slug);
    } catch (e: any) {
      report.diagnostics.WP_FETCH_ERROR.push({ ...baseObj, slug, reason: e.message });
      continue;
    }
    
    // No post found or no categories found
    if (!wpCategories) {
      report.diagnostics.WP_POST_NOT_FOUND.push({ ...baseObj, slug });
      continue;
    }
    
    if (wpCategories.length === 0) {
      // It's possible post was found but has no categories
      // But getWPCategories returns [] for both. Let's refine.
      const res = await fetch(`https://entertainlawyers.com/wp-json/wp/v2/posts?slug=${slug}`);
      const posts = await res.json();
      if (!posts || posts.length === 0) {
        report.diagnostics.WP_POST_NOT_FOUND.push({ ...baseObj, slug, reason: 'WP post not found' });
      } else {
        report.diagnostics.NO_CATEGORIES_IN_WP.push({ ...baseObj, slug, reason: 'WP post has no categories' });
      }
      continue;
    }

    // Attempt to match WP Categories to Prisma Subjects
    let matchedSubjects = new Set<typeof subjects[0]>();
    let matchEvidence: any[] = [];
    
    for (const cat of wpCategories) {
      for (const sub of subjects) {
        if (sub.name.toLowerCase() === cat.name.toLowerCase() || 
            (sub.slug && cat.slug && sub.slug.toLowerCase() === cat.slug.toLowerCase())) {
          matchedSubjects.add(sub);
          matchEvidence.push({ wpCategory: cat.name, prismaSubject: sub.name, matchType: 'exact' });
        }
      }
    }
    
    const matchedArray = Array.from(matchedSubjects);
    const observedCategories = wpCategories.map(c => c.name);
    
    if (matchedArray.length === 0) {
      // See if current subject matches partially
      let currentSubjMatch = false;
      if (resource.subject) {
         for (const cat of wpCategories) {
            if (resource.subject.name.toLowerCase().includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(resource.subject.name.toLowerCase())) {
                currentSubjMatch = true;
            }
         }
      }
      
      report.diagnostics.NAMING_MISMATCH.push({
        ...baseObj,
        slug,
        wpCategories: wpCategories.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
        reason: currentSubjMatch ? 'Current subject partially matches WP category' : 'No exact match found in Prisma Subjects',
        recommendedAction: currentSubjMatch ? 'KEEP' : 'MANUAL_REVIEW'
      });
    } else if (matchedArray.length > 1) {
      report.diagnostics.AMBIGUOUS_MATCH.push({
        ...baseObj,
        slug,
        wpCategories: observedCategories,
        matchedSubjects: matchedArray.map(s => s.name),
        reason: 'WP Categories match multiple Prisma Subjects'
      });
    } else {
      const matched = matchedArray[0];
      if (matched.id === resource.subjectId) {
        report.unchanged.push({ ...baseObj, slug, reason: 'Already correctly assigned' });
      } else {
        report.proposedFixes.push({
          ...baseObj,
          slug,
          proposedSubjectId: matched.id,
          proposedSubjectName: matched.name,
          evidence: matchEvidence,
          reason: 'Exact category match found'
        });
      }
    }
  }

  // Calculate counts
  report.counts.proposedFixes = report.proposedFixes.length;
  report.counts.unchanged = report.unchanged.length;
  report.counts.MISSING_RESOURCES_JSON = report.diagnostics.MISSING_RESOURCES_JSON.length;
  report.counts.WP_POST_NOT_FOUND = report.diagnostics.WP_POST_NOT_FOUND.length;
  report.counts.WP_FETCH_ERROR = report.diagnostics.WP_FETCH_ERROR.length;
  report.counts.NO_CATEGORIES_IN_WP = report.diagnostics.NO_CATEGORIES_IN_WP.length;
  report.counts.NAMING_MISMATCH = report.diagnostics.NAMING_MISMATCH.length;
  report.counts.AMBIGUOUS_MATCH = report.diagnostics.AMBIGUOUS_MATCH.length;

  const outPath = path.join(process.cwd(), 'diagnostics-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  
  console.log('\nDiagnostic Complete:');
  console.log(report.counts);
  console.log(`Report written to ${outPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
