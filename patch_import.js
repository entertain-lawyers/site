const fs = require('fs');
const file = 'scripts-recovered/migration.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `async function importStaging() {
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const phase5Decisions = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), 'utf-8'));
    const { generatePostId, generateResourceId, generateSubjectId } = require('./migration-identity.js');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log("Connecting to:", process.env.DATABASE_URL.split('@')[1]);
    console.log("Importing deterministically via upsert...");

    const decisionMap = new Map();
    phase5Decisions.forEach(d => {
        decisionMap.set(\`\${d.source.site}-\${d.source.wpPostId}\`, d);
    });

    let pCreated = 0, pUpdated = 0;
    for (const p of posts) {
        const detId = generatePostId(p.sourceSite, p.wordpressPostId);
        const data = {
            title: p.title,
            content: p.content,
            type: p.type,
            status: p.status
        };
        const res = await prisma.post.upsert({
            where: { id: detId },
            update: data,
            create: { id: detId, ...data }
        });
        if (res.createdAt.getTime() === res.updatedAt.getTime()) pCreated++;
        else pUpdated++;
    }

    let rCreated = 0, rUpdated = 0;
    for (const r of resources) {
        const detId = generateResourceId(r.sourceSite, r.wordpressPostId);
        
        let finalSubjectId = null;
        const decision = decisionMap.get(\`\${r.sourceSite}-\${r.wordpressPostId}\`);
        if (decision && decision.decisionStatus === 'APPROVED_EXISTING_SUBJECT') {
            const semName = decision.proposedTarget.semester;
            const subName = decision.proposedTarget.subject;
            if (semName && subName) {
                finalSubjectId = generateSubjectId(semName, subName);
            }
        }

        const data = {
            title: r.title,
            type: r.type,
            status: r.status
        };
        if (finalSubjectId) {
            data.subjectId = finalSubjectId;
        } else if (r.subjectId === null) {
            // Null subject fallback
            data.subjectId = '00000000-0000-0000-0000-000000000000'; // Temporary fallback for unmapped if schema requires non-null
        }

        try {
            await prisma.resource.upsert({
                where: { id: detId },
                update: data,
                create: { id: detId, ...data }
            });
            rCreated++;
        } catch (e) {
            console.log("Error importing resource", r.title, e.message);
        }
    }
    
    await prisma.$disconnect();
    console.log(\`Import Complete: Posts: \${pCreated} created, \${pUpdated} updated. Resources: \${rCreated} created/updated.\`);
}`;

content = content.replace(/async function importStaging\(\) \{[\s\S]*?console\.log\(`Imported \$\{countP\} Posts and \$\{countR\} Resources\.`\);\n\}/, replacement);
fs.writeFileSync(file, content);
console.log("Patched migration.js");
