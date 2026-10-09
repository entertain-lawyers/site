import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({ include: { semester: true } });
  
  const inPath = path.join(process.cwd(), 'diagnostics-report.json');
  const reportData = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  
  const finalReport = [] as any[];
  
  // 1. Proposed Fixes
  for (const item of reportData.proposedFixes) {
    finalReport.push({
      resourceId: item.id,
      title: item.title,
      currentSubject: item.currentSubjectName,
      wordpressIdentifier: item.slug,
      observedCategory: item.evidence.map((e: any) => e.wpCategory).join(', '),
      proposedSubject: item.proposedSubjectName,
      confidence: 'HIGH',
      reason: 'Exact Category Name Match',
      recommendedAction: 'UPDATE'
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
    let reason = item.reason;
    let action = item.recommendedAction;
    
    const obsCats = item.wpCategories.map((c: any) => c.name).join(', ');

    // Manual heuristic matching based on observations
    if (obsCats.includes('Evidence Law')) {
      proposedSubject = 'Law of Evidence';
      confidence = 'HIGH';
      reason = 'Commonly known naming mismatch resolved';
      action = 'UPDATE';
    } else if (obsCats.includes('Law of Banking and Negotiable Instruments')) {
      proposedSubject = 'Banking and Insurance Law';
      confidence = 'HIGH';
      reason = 'Commonly known naming mismatch resolved';
      action = 'UPDATE';
    } else if (obsCats.includes('Company Law')) {
      proposedSubject = 'Company Law';
      confidence = 'HIGH';
      reason = 'Commonly known naming mismatch resolved';
      action = 'UPDATE';
    } else if (obsCats.includes('Administrative Law')) {
      proposedSubject = 'Administrative Law';
      confidence = 'HIGH';
      reason = 'Commonly known naming mismatch resolved';
      action = 'UPDATE';
    }

    if (proposedSubject && proposedSubject === item.currentSubjectName) {
      action = 'KEEP';
      reason = 'Already assigned to correct mapped subject';
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
    let reason = item.reason;
    let action = 'MANUAL_REVIEW';
    
    // Heuristic: If title says "Property Law Case ... (3rd Semester)" -> Property Law
    if (item.title.includes('Property Law') && item.title.includes('3rd Semester')) {
      proposedSubject = 'Property Law';
      confidence = 'HIGH';
      reason = 'Title strongly implies Property Law (3rd Semester)';
      action = 'UPDATE';
    }
    
    if (proposedSubject && proposedSubject === item.currentSubjectName) {
      action = 'KEEP';
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
  
  md += `## Categorization of 246 Resources\n\n`;
  const updates = finalReport.filter(r => r.recommendedAction === 'UPDATE');
  const keeps = finalReport.filter(r => r.recommendedAction === 'KEEP');
  const manuals = finalReport.filter(r => r.recommendedAction === 'MANUAL_REVIEW');
  
  md += `- **Updates Proposed (High Confidence):** ${updates.length}\n`;
  md += `- **Already Correct (Keep):** ${keeps.length}\n`;
  md += `- **Manual Review Required:** ${manuals.length}\n\n`;
  
  md += `## Breakdown of Reasons\n`;
  md += `- **Missing from resources.json:** ${reportData.diagnostics.MISSING_RESOURCES_JSON.length}\n`;
  md += `- **WordPress Post Not Found:** ${reportData.diagnostics.WP_POST_NOT_FOUND.length}\n`;
  md += `- **Naming Mismatch (WP vs Prisma):** ${reportData.diagnostics.NAMING_MISMATCH.length}\n`;
  md += `- **Exact Matches Found:** ${reportData.proposedFixes.length}\n`;
  md += `- **Already Correct Exact Matches:** ${reportData.unchanged.length}\n\n`;

  md += `## Details of Proposed Fixes\n`;
  md += `| Resource Title | Current Subject | Proposed Subject | Reason |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const u of updates) {
    md += `| ${u.title.substring(0,40)}... | ${u.currentSubject || 'NULL'} | ${u.proposedSubject} | ${u.reason} |\n`;
  }
  
  fs.writeFileSync(mdPath, md);
  console.log('Analysis Complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
