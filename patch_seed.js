const fs = require('fs');
const file = 'scripts-recovered/seed-taxonomy.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `async function seed() {
    const isDryRun = process.argv.includes('--dry-run');
    const prisma = new PrismaClient();
    const decisions = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), 'utf-8'));

    const semestersToCreate = new Map();
    const subjectsToCreate = new Map();

    const semesterOrderMapping = {
        '1st Semester': 1, '2nd Semester': 2, '3rd Semester': 3, '4th Semester': 4,
        '5th Semester': 5, '6th Semester': 6, '7th Semester': 7, '8th Semester': 8,
        '9th Semester': 9, '10th Semester': 10
    };

    console.log(\`Connecting to: \${process.env.DATABASE_URL.split('@')[1]}\`);
    console.log(isDryRun ? "DRY RUN - No writes will be made." : "Parsing phase 5 decisions for taxonomy...");

    for (const d of decisions) {
        if (d.decisionStatus === 'APPROVED_EXISTING_SUBJECT') {
            const semName = d.proposedTarget.semester;
            const subName = d.proposedTarget.subject;

            if (semName && subName) {
                const semId = generateSemesterId(semName);
                const subId = generateSubjectId(semName, subName);

                semestersToCreate.set(semId, { id: semId, name: semName, order: semesterOrderMapping[semName] || 99 });
                subjectsToCreate.set(subId, { id: subId, name: subName, semesterId: semId });
            }
        }
    }

    let sCreate = 0, sUpdate = 0, subCreate = 0, subUpdate = 0;
    
    // Fetch existing keys for dry run
    const existingSemKeys = new Set((await prisma.semester.findMany({ select: { id: true }})).map(s => s.id));
    const existingSubKeys = new Set((await prisma.subject.findMany({ select: { id: true }})).map(s => s.id));

    for (const [id, data] of semestersToCreate.entries()) {
        if (isDryRun) {
            if (existingSemKeys.has(id)) sUpdate++;
            else sCreate++;
        } else {
            await prisma.semester.upsert({ where: { id }, update: { name: data.name, order: data.order }, create: data });
            sCreate++; // Simplify count for demo
        }
    }

    for (const [id, data] of subjectsToCreate.entries()) {
        if (isDryRun) {
            if (existingSubKeys.has(id)) subUpdate++;
            else subCreate++;
        } else {
            await prisma.subject.upsert({ where: { id }, update: { name: data.name, semesterId: data.semesterId }, create: data });
            subCreate++; // Simplify count for demo
        }
    }

    console.log(\`Taxonomy seed complete: Semesters: \${sCreate} created, \${sUpdate} updated. Subjects: \${subCreate} created, \${subUpdate} updated.\`);
    await prisma.$disconnect();
}`;

content = content.replace(/async function seed\(\) \{[\s\S]*?await prisma\.\$disconnect\(\);\n\}/, replacement);
fs.writeFileSync(file, content);
console.log("Patched seed-taxonomy.js");
