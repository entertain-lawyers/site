import { PrismaClient } from '@prisma/client';
import { SYLLABUS_CONFIG } from '../src/lib/syllabus-config';
import fs from 'fs';

const prisma = new PrismaClient();

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  const existingSubjects = await prisma.subject.findMany();
  
  const report: string[] = [];
  report.push('# Subject Mapping Report');
  
  let exact = 0;
  let normalized = 0;
  let missing = 0;

  for (const sem of SYLLABUS_CONFIG) {
    report.push(`\n## ${sem.name}`);
    for (const sub of sem.subjects) {
      // Exact match
      const exactMatch = existingSubjects.find(s => s.name.toLowerCase() === sub.name.toLowerCase());
      if (exactMatch) {
        report.push(`- [EXACT] ${sub.name} -> ${exactMatch.name} (ID: ${exactMatch.id})`);
        exact++;
        continue;
      }

      // Normalized match
      const normName = normalize(sub.name);
      const normMatches = existingSubjects.filter(s => normalize(s.name) === normName);
      if (normMatches.length === 1) {
        report.push(`- [NORMALIZED] ${sub.name} -> ${normMatches[0].name} (ID: ${normMatches[0].id})`);
        normalized++;
        continue;
      }
      
      if (normMatches.length > 1) {
        report.push(`- [AMBIGUOUS] ${sub.name} -> Multiple matches: ${normMatches.map(m => m.name).join(', ')}`);
        missing++;
        continue;
      }

      // Semantic/Partial manual checks can be reported here.
      // Let's check if the existing subject contains the main words.
      const words = sub.name.split(' ').filter(w => w.length > 3);
      const partialMatches = existingSubjects.filter(s => 
        words.some(w => s.name.toLowerCase().includes(w.toLowerCase()))
      );

      if (partialMatches.length > 0) {
        report.push(`- [MISSING/PARTIAL] ${sub.name} (Possible existing: ${partialMatches.map(p => p.name).join(', ')})`);
      } else {
        report.push(`- [MISSING] ${sub.name}`);
      }
      missing++;
    }
  }

  report.push(`\nSummary: Exact: ${exact}, Normalized: ${normalized}, Missing/Ambiguous: ${missing}`);
  fs.writeFileSync('SUBJECT_MAPPING_REPORT.md', report.join('\n'));
  console.log('Report written to SUBJECT_MAPPING_REPORT.md');
}

main().finally(() => prisma.$disconnect());
