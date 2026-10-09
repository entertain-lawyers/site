import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function getWPCategories(slug: string): Promise<string[]> {
  try {
    const res = await fetch(`https://entertainlawyers.com/wp-json/wp/v2/posts?slug=${slug}`);
    if (!res.ok) return [];
    const posts = await res.json();
    if (!posts || posts.length === 0) return [];
    const categoryIds = posts[0].categories;
    if (!categoryIds || categoryIds.length === 0) return [];
    
    const catRes = await fetch(`https://entertainlawyers.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`);
    if (!catRes.ok) return [];
    const categories = await catRes.json();
    return categories.map((c: any) => c.name);
  } catch (error) {
    console.error(`Error fetching WP categories for ${slug}:`, error);
    return [];
  }
}

async function main() {
  console.log('Starting dry-run subject repair...');
  
  // 1. Fetch Prisma Subjects
  const subjects = await prisma.subject.findMany({ include: { semester: true } });
  const subjectNameMap = new Map<string, typeof subjects[0]>();
  for (const sub of subjects) {
    subjectNameMap.set(sub.name.toLowerCase(), sub);
  }
  
  // 2. Load migration resource mapping (title -> slug)
  const mappingFile = path.join(process.cwd(), 'migration-staging-recovered', 'resources.json');
  let titleToSlug = new Map<string, string>();
  if (fs.existsSync(mappingFile)) {
    const rawData = fs.readFileSync(mappingFile, 'utf-8');
    const records = JSON.parse(rawData);
    for (const record of records) {
      if (record.title && record.wordpressSlug) {
        titleToSlug.set(record.title, record.wordpressSlug);
      }
    }
  } else {
    console.warn(`Warning: Could not find ${mappingFile}. Title-to-slug mapping will be empty.`);
  }

  // 3. Fetch all Resources from Prisma
  const resources = await prisma.resource.findMany({ include: { subject: true } });
  
  const report = {
    proposedChanges: [] as any[],
    unchangedRecords: [] as any[],
    ambiguousRecords: [] as any[],
    unmatchedRecords: [] as any[],
  };

  let count = 0;
  
  for (const resource of resources) {
    count++;
    if (count % 10 === 0) console.log(`Processed ${count}/${resources.length} resources...`);
    
    const slug = titleToSlug.get(resource.title);
    if (!slug) {
      report.unmatchedRecords.push({
        id: resource.id,
        title: resource.title,
        reason: 'No wordpressSlug found in resources.json',
        currentSubject: resource.subject?.name || null
      });
      continue;
    }
    
    const wpCategoryNames = await getWPCategories(slug);
    
    if (wpCategoryNames.length === 0) {
      report.unmatchedRecords.push({
        id: resource.id,
        title: resource.title,
        slug,
        reason: 'No categories found in WordPress',
        currentSubject: resource.subject?.name || null
      });
      continue;
    }
    
    // Find matching subjects
    const matchingSubjects = wpCategoryNames
      .map(name => subjectNameMap.get(name.toLowerCase()))
      .filter(Boolean) as typeof subjects;
      
    if (matchingSubjects.length === 0) {
      report.unmatchedRecords.push({
        id: resource.id,
        title: resource.title,
        slug,
        wpCategories: wpCategoryNames,
        reason: 'WP Categories do not match any Prisma Subject',
        currentSubject: resource.subject?.name || null
      });
      continue;
    }
    
    if (matchingSubjects.length > 1) {
      report.ambiguousRecords.push({
        id: resource.id,
        title: resource.title,
        slug,
        wpCategories: wpCategoryNames,
        matchingSubjects: matchingSubjects.map(s => s.name),
        reason: 'WP Categories match multiple Prisma Subjects',
        currentSubject: resource.subject?.name || null
      });
      continue;
    }
    
    const matchedSubject = matchingSubjects[0];
    
    if (resource.subjectId === matchedSubject.id) {
      report.unchangedRecords.push({
        id: resource.id,
        title: resource.title,
        subjectId: matchedSubject.id,
        subjectName: matchedSubject.name
      });
    } else {
      report.proposedChanges.push({
        id: resource.id,
        title: resource.title,
        slug,
        oldSubjectId: resource.subjectId,
        oldSubjectName: resource.subject?.name || null,
        newSubjectId: matchedSubject.id,
        newSubjectName: matchedSubject.name,
        wpCategories: wpCategoryNames
      });
    }
  }
  
  const reportPath = path.join(process.cwd(), 'subject-repair-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\nDry run complete. Report written to ${reportPath}`);
  console.log(`Proposed Changes: ${report.proposedChanges.length}`);
  console.log(`Unchanged: ${report.unchangedRecords.length}`);
  console.log(`Ambiguous: ${report.ambiguousRecords.length}`);
  console.log(`Unmatched: ${report.unmatchedRecords.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
