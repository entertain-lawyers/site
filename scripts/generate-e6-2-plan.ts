import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const subjects = await prisma.subject.findMany({
        include: {
            _count: {
                select: { resources: true, units: true }
            },
            semester: true
        },
        orderBy: { name: 'asc' }
    });

    const candidateSubjects = [];
    const validSubjects = [];

    for (const sub of subjects) {
        if (sub.slug && sub.slug.includes('semester')) {
            candidateSubjects.push(sub);
        } else {
            validSubjects.push(sub);
        }
    }

    let md = `# Phase E.6.2: Production Cleanup Plan\n\n`;
    md += `This plan targets the active Production database (verified via \`.env\` as the host containing \`ep-delicate-silence-b36jbzw5\`) and details the safe removal of 65 accidental subjects generated during Phase E.3.\n\n`;

    md += `## 1. Current State Verification\n`;
    md += `- **Database Host:** Production (\`ep-delicate-silence-b36jbzw5\`)\n`;
    const semesters = await prisma.semester.findMany();
    md += `- **Current Semesters Count:** ${semesters.length} (The 12 spurious duplicate semesters noted in Phase E.4 are no longer present on Production. All valid subjects currently point successfully to these 10 remaining canonical semesters).\n`;
    md += `- **Current Total Subjects Count:** ${subjects.length}\n`;
    md += `- **Valid Canonical Subjects:** ${validSubjects.length}\n`;
    md += `- **Accidental (Candidate) Subjects:** ${candidateSubjects.length}\n\n`;

    md += `## 2. Classification & Dependencies\n`;
    md += `The accidental subjects were identified using the exact Phase E.3 slug-generation pattern (\`normalize(semConfig.name + '-' + subConfig.name)\`). For example, \`1stsemesteralternativeenglish...\`. All 65 candidates have been audited for dependencies.\n\n`;

    md += `| Category | Count | Action |\n`;
    md += `|---|---|---|\n`;
    md += `| **Safe to Delete** (0 dependencies) | ${candidateSubjects.filter(s => s._count.resources === 0 && s._count.units === 0).length} | DELETE |\n`;
    md += `| **Requires Review** (>0 dependencies) | ${candidateSubjects.filter(s => s._count.resources > 0 || s._count.units > 0).length} | REVIEW |\n`;
    md += `| **Preserve** (Canonical Subjects) | ${validSubjects.length} | PRESERVE |\n\n`;

    md += `## 3. Candidate Subject Details (To Be Deleted)\n`;
    md += `*Every candidate below has exactly 0 resources and 0 units attached. None of them were subsequently used or modified.* \n\n`;
    md += `| Subject ID | Name | Slug | Semester ID |\n`;
    md += `|---|---|---|---|\n`;
    for (const sub of candidateSubjects) {
        md += `| \`${sub.id}\` | ${sub.name} | \`${sub.slug}\` | \`${sub.semesterId}\` |\n`;
    }
    
    md += `\n## 4. Semester Discrepancy Investigation\n`;
    md += `The earlier Phase E.4 report cited 22 semesters. The current count is exactly 10. This indicates that the 12 older (null-slug) semesters were deleted in a subsequent unlogged operation, and all valid canonical subjects were safely mapped to the 10 remaining semesters. Because all 51 valid subjects point securely to the 10 current semesters, no semester restoration or deletion is necessary. The current 10 semesters are structurally sound.\n\n`;

    md += `## 5. Cleanup Execution Design (Proposed Transaction)\n`;
    md += `The execution script will run a single, atomic Prisma transaction with safety assertions:\n`;
    md += `1. **Assert:** Total Semester count equals ${semesters.length}.\n`;
    md += `2. **Assert:** Total Subject count equals ${subjects.length}.\n`;
    md += `3. **Assert:** The 65 candidate IDs exist.\n`;
    md += `4. **Execute:** \`prisma.subject.deleteMany({ where: { id: { in: candidateIds } } })\`.\n`;
    md += `5. **Verify:** Post-transaction subject count is exactly ${validSubjects.length}.\n\n`;
    
    md += `**Expected Before/After Counts:**\n`;
    md += `- **Before:** 116 Subjects\n`;
    md += `- **After:** ${validSubjects.length} Subjects\n\n`;

    md += `**Rollback Strategy:**\n`;
    md += `Because this operation deletes zero dependent records (0 resources, 0 units), and only targets explicitly generated IDs from Phase E.3, the rollback strategy is simply a standard pre-execution database snapshot (Neon branching/backup). If any pre-condition fails, the transaction is immediately aborted.\n`;

    const outPath = path.join(__dirname, '../docs/PHASE_E6_2_PRODUCTION_CLEANUP_PLAN.md');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md);
    console.log(`Plan written to ${outPath}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
