import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const ALIAS_MAP: Record<string, string> = {
  'Law of Banking and Negotiable Instruments': 'Banking and Insurance Law',
  'Evidence Law': 'Law of Evidence',
  'Labour Law': 'Labor Law',
  'Company Law and Governance': 'Company Law',
  'Contract Law-I': 'Law of Contract-I',
  'Contract Law-II': 'Law of Contract-II',
  'Public International Law-II': 'International Law',
};

const IGNORE_CATEGORIES = new Set(['Civil', 'Criminal', 'Writs']);

async function main() {
  console.log('Starting Phase C.3 Alias Analysis...');

  const subjects = await prisma.subject.findMany({ include: { semester: true } });
  
  const inPath = path.join(process.cwd(), 'subject-repair-analysis.json');
  const reportData = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  
  // We only care about the 70 NAMING_MISMATCH items
  const mismatchItems = reportData.filter((r: any) => r.reason.startsWith('WP Categories:'));
  
  const aliasAnalysis = {
    confirmedAliases: [] as any[],
    alreadyCorrect: [] as any[],
    ambiguousMatches: [] as any[],
    unmatchedRecords: [] as any[],
  };

  for (const item of mismatchItems) {
    const obsCatsRaw = item.observedCategory.split(', ').map((c: string) => c.trim());
    
    // Filter out ignored categories (topics)
    const validCats = obsCatsRaw.filter((c: string) => !IGNORE_CATEGORIES.has(c));
    
    if (validCats.length === 0) {
      // E.g. only "Criminal", "Civil", "Writs"
      aliasAnalysis.unmatchedRecords.push({
        ...item,
        reason: 'Insufficient evidence (only topics like Civil/Criminal/Writs found)'
      });
      continue;
    }
    
    // Try to map valid cats to Prisma Subjects
    const proposedSubjects = new Set<string>();
    
    for (const cat of validCats) {
      if (ALIAS_MAP[cat]) {
        proposedSubjects.add(ALIAS_MAP[cat]);
      } else {
        // Find exact or partial in Prisma? We already know they are mismatches, so no exact.
        // Let's rely on the ALIAS_MAP for explicit aliasing.
      }
    }
    
    const proposedArray = Array.from(proposedSubjects);
    
    if (proposedArray.length === 0) {
      aliasAnalysis.unmatchedRecords.push({
        ...item,
        reason: `No alias found for valid categories: ${validCats.join(', ')}`
      });
    } else if (proposedArray.length > 1) {
      aliasAnalysis.ambiguousMatches.push({
        ...item,
        proposedSubjects: proposedArray,
        reason: `Valid categories map to multiple subjects: ${proposedArray.join(', ')}`
      });
    } else {
      const proposedSubjName = proposedArray[0];
      const propSubj = subjects.find(s => s.name === proposedSubjName);
      
      if (!propSubj) {
        aliasAnalysis.unmatchedRecords.push({ ...item, reason: `Alias target ${proposedSubjName} not found in DB` });
        continue;
      }
      
      // Is it already correct?
      if (item.currentSubject === proposedSubjName) {
        aliasAnalysis.alreadyCorrect.push({
          ...item,
          proposedSubject: proposedSubjName,
          reason: `Already assigned to correct alias target: ${proposedSubjName}`
        });
      } else {
        aliasAnalysis.confirmedAliases.push({
          ...item,
          proposedSubject: proposedSubjName,
          proposedSubjectId: propSubj.id,
          reason: `Authoritative alias mapping from [${validCats.join(', ')}] -> ${proposedSubjName}`
        });
      }
    }
  }
  
  // Output JSON
  const outJsonPath = path.join(process.cwd(), 'subject-alias-map.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(aliasAnalysis, null, 2));
  
  // Generate MD
  const outMdPath = path.join(process.cwd(), 'subject-alias-analysis.md');
  let md = `# Phase C.3: Subject Alias Mapping Analysis\n\n`;
  
  md += `## Summary of 70 Mismatch Records\n\n`;
  md += `- **Confirmed Aliases (Actionable Fixes):** ${aliasAnalysis.confirmedAliases.length}\n`;
  md += `- **Already Correctly Assigned:** ${aliasAnalysis.alreadyCorrect.length}\n`;
  md += `- **Ambiguous Matches:** ${aliasAnalysis.ambiguousMatches.length}\n`;
  md += `- **Unmatched (Insufficient Evidence):** ${aliasAnalysis.unmatchedRecords.length}\n\n`;
  
  md += `## Alias Map Rules\n`;
  md += `The following explicit mapping rules were applied based on the observed data:\n`;
  for (const [wpCat, prismaSubj] of Object.entries(ALIAS_MAP)) {
    md += `- \`${wpCat}\` ➔ \`${prismaSubj}\`\n`;
  }
  md += `\n*Note: Categories such as Civil, Criminal, and Writs were ignored as generic topics if a specific subject was also present.*\n\n`;
  
  md += `## Confirmed Aliases\n`;
  md += `These records have a strong, verifiable alias and need their \`subjectId\` updated in the database.\n\n`;
  md += `| Resource Title | Current Subject | Proposed Subject | Evidence |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const item of aliasAnalysis.confirmedAliases) {
    md += `| ${item.title.substring(0,40)}... | ${item.currentSubject || 'NULL'} | ${item.proposedSubject} | ${item.reason} |\n`;
  }
  
  fs.writeFileSync(outMdPath, md);
  
  console.log(`Phase C.3 Analysis Complete!`);
  console.log(`Confirmed Aliases: ${aliasAnalysis.confirmedAliases.length}`);
  console.log(`Already Correct: ${aliasAnalysis.alreadyCorrect.length}`);
  console.log(`Ambiguous: ${aliasAnalysis.ambiguousMatches.length}`);
  console.log(`Unmatched: ${aliasAnalysis.unmatchedRecords.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
