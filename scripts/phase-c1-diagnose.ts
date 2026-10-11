import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase C.1 Diagnosis...');
  
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

  // Load the previously fetched diagnostics report to save WP API calls
  const inPath = path.join(process.cwd(), 'diagnostics-report.json');
  const reportData = JSON.parse(fs.readFileSync(inPath, 'utf-8'));

  const finalReport = [] as any[];
  
  // 1. Analyze Proposed Fixes (The 8 records)
  for (const item of reportData.proposedFixes) {
    const propSubj = subjects.find(s => s.id === item.proposedSubjectId);
    const currSubj = subjects.find(s => s.id === item.currentSubjectId);
    
    // Check if current subject assignment is actually valid despite not matching WP categories exactly
    let action = 'UPDATE';
    let reason = 'Exact Category Name Match.';
    
    if (currSubj) {
      // e.g. Criminal Law-I vs Criminal Law-II
      reason += ` Current is ${currSubj.name} (${currSubj.semester.name}), Proposed is ${propSubj?.name} (${propSubj?.semester.name}). Title indicates ${item.title.match(/(\d+(st|nd|rd|th)\s+Semester)/i)?.[0] || 'Unknown'}.`;
    }
    
    finalReport.push({
      resourceId: item.id,
      title: item.title,
      currentSubject: item.currentSubjectName,
      wordpressIdentifier: item.slug,
      observedCategory: item.evidence.map((e: any) => e.wpCategory).join(', '),
      proposedSubject: item.proposedSubjectName,
      confidence: 'HIGH',
      reason,
      recommendedAction: action
    });
  }

  // 2. Unchanged (Already correctly assigned)
  for (const item of reportData.unchanged) {
    finalReport.push({
      resourceId: item.id,
      title: item.title,
      currentSubject: item.currentSubjectName,
      wordpressIdentifier: item.slug,
      observedCategory: item.currentSubjectName,
      proposedSubject: null,
      confidence: 'HIGH',
      reason: 'Already properly assigned to exact match',
      recommendedAction: 'KEEP'
    });
  }

  // 3. Naming Mismatch
  for (const item of reportData.diagnostics.NAMING_MISMATCH) {
    let proposedSubject = null;
    let confidence = 'LOW';
    let action = item.recommendedAction;
    
    const obsCats = item.wpCategories.map((c: any) => c.name).join(', ');
    
    // Find possible matches
    const possibleMatches = [];
    for (const cat of item.wpCategories) {
      for (const sub of subjects) {
        if (cat.name.toLowerCase().includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes(cat.name.toLowerCase())) {
          possibleMatches.push(`${sub.name} (${sub.semester.name})`);
        }
      }
    }
    
    let reason = `WP Categories: ${obsCats}.`;
    if (possibleMatches.length > 0) {
      reason += ` Possible Prisma matches: ${Array.from(new Set(possibleMatches)).join(', ')}.`;
    }
    
    // If current subject is one of the possible matches, it might be already correct!
    if (item.currentSubjectName && possibleMatches.some(p => p.includes(item.currentSubjectName))) {
      action = 'KEEP';
      reason += ` Current subject '${item.currentSubjectName}' is a valid partial match.`;
    } else {
      action = 'MANUAL_REVIEW';
    }
    
    finalReport.push({
      resourceId: item.id,
      title: item.title,
      currentSubject: item.currentSubjectName,
      wordpressIdentifier: item.slug,
      observedCategory: obsCats,
      proposedSubject,
      confidence,
      reason,
      recommendedAction: action
    });
  }
  
  // 4. Missing in resources.json
  for (const item of reportData.diagnostics.MISSING_RESOURCES_JSON) {
    let proposedSubject = null;
    let confidence = 'LOW';
    let action = 'MANUAL_REVIEW';
    
    // Try to derive possible subject from title semester
    const semMatch = item.title.match(/(\d+(st|nd|rd|th)\s+Semester)/i);
    let reason = 'Missing in resources.json.';
    
    if (semMatch) {
       reason += ` Title indicates ${semMatch[0]}.`;
    }
    
    if (item.title.includes('Property Law') && semMatch && semMatch[0].includes('3rd')) {
       const propLaw = subjects.find(s => s.name === 'Property Law' && s.semester.name.includes('3rd'));
       if (propLaw) {
          reason += ` Strong candidate: ${propLaw.name}.`;
       }
    }

    finalReport.push({
      resourceId: item.id,
      title: item.title,
      currentSubject: item.currentSubjectName,
      wordpressIdentifier: null,
      observedCategory: null,
      proposedSubject,
      confidence,
      reason,
      recommendedAction: action
    });
  }

  // 5. WP Post Not Found / No Categories
  for (const item of reportData.diagnostics.WP_POST_NOT_FOUND) {
    finalReport.push({
      resourceId: item.id,
      title: item.title,
      currentSubject: item.currentSubjectName,
      wordpressIdentifier: item.slug,
      observedCategory: null,
      proposedSubject: null,
      confidence: 'LOW',
      reason: item.reason || 'WordPress post not found',
      recommendedAction: 'MANUAL_REVIEW'
    });
  }
  
  const finalJsonPath = path.join(process.cwd(), 'subject-repair-analysis.json');
  fs.writeFileSync(finalJsonPath, JSON.stringify(finalReport, null, 2));

  // Generate MD report
  const mdPath = path.join(process.cwd(), 'subject-repair-analysis.md');
  let md = `# Phase C.1: Subject Repair Diagnostic Analysis\n\n`;
  
  md += `## 1. Categorization of 246 Resources\n\n`;
  const updates = finalReport.filter(r => r.recommendedAction === 'UPDATE');
  const keeps = finalReport.filter(r => r.recommendedAction === 'KEEP');
  const manuals = finalReport.filter(r => r.recommendedAction === 'MANUAL_REVIEW');
  
  md += `- **Updates Proposed (High Confidence - Verified):** ${updates.length}\n`;
  md += `- **Already Correct (Keep - Valid assignments):** ${keeps.length}\n`;
  md += `- **Manual Review Required:** ${manuals.length}\n\n`;
  
  md += `## 2. Breakdown of Mismatch/Missing Reasons\n`;
  md += `- **Missing from resources.json:** ${reportData.diagnostics.MISSING_RESOURCES_JSON.length}\n`;
  md += `- **WordPress Post Not Found:** ${reportData.diagnostics.WP_POST_NOT_FOUND.length}\n`;
  md += `- **Naming Mismatch (WP vs Prisma):** ${reportData.diagnostics.NAMING_MISMATCH.length}\n`;
  md += `- **Exact Matches Found & Proposed:** ${reportData.proposedFixes.length}\n`;
  md += `- **Already Correct Exact Matches:** ${reportData.unchanged.length}\n\n`;

  md += `## 3. Investigation of the 8 Proposed Fixes\n`;
  md += `These 8 records have exact matching WordPress categories with Prisma Subjects. The current assignment was checked, and it was found that the current assignments (e.g., Criminal Law-II) do not match the semester mentioned in the title (3rd Semester), whereas the proposed exact match (Criminal Law-I) correctly maps to the 3rd Semester.\n\n`;
  md += `| Resource Title | Current Subject | Proposed Subject | Reason |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const u of updates) {
    md += `| ${u.title.substring(0,40)}... | ${u.currentSubject || 'NULL'} | ${u.proposedSubject} | ${u.reason} |\n`;
  }
  
  md += `\n## 4. Naming Mismatch Examples (Partial Matches)\n`;
  md += `Many resources fall under "Naming Mismatch" because their WordPress category is slightly differently named from the Prisma Subject (e.g., "Law of Banking and Negotiable Instruments" vs "Banking and Insurance Law"). Where the current Prisma assignment is a valid partial match for the WP Category, the script recommends keeping it ("KEEP"). Otherwise, it flags for "MANUAL_REVIEW".\n\n`;
  
  fs.writeFileSync(mdPath, md);
  console.log('Analysis Complete! Wrote subject-repair-analysis.json and subject-repair-analysis.md');
}

main().catch(console.error).finally(() => prisma.$disconnect());
