const fs = require('fs');
const file = 'scripts-recovered/migration.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `async function importStaging(args) {
    const isDryRun = args.includes('--dry-run');
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const phase5Decisions = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), 'utf-8'));
    const { generatePostId, generateResourceId, generateSubjectId } = require('./migration-identity.js');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log("Connecting to:", process.env.DATABASE_URL.split('@')[1]);
    console.log(isDryRun ? "DRY RUN - No writes will be made." : "Importing deterministically via upsert...");

    const decisionMap = new Map();
    phase5Decisions.forEach(d => {
        decisionMap.set(\`\${d.source.site}-\${d.source.wpPostId}\`, d);
    });

    let pCreated = 0, pUpdated = 0, pUnchanged = 0, pSkipped = 0, pFailed = 0;
    
    // Fetch existing keys for dry run duplicate detection
    const existingPostKeys = new Set((await prisma.post.findMany({ select: { id: true }})).map(p => p.id));
    const existingResKeys = new Set((await prisma.resource.findMany({ select: { id: true }})).map(r => r.id));

    for (const p of posts) {
        const detId = generatePostId(p.sourceSite, p.wordpressPostId);
        const data = {
            title: p.title,
            content: p.content,
            type: p.type,
            status: p.status
        };
        try {
            if (isDryRun) {
                if (existingPostKeys.has(detId)) pUpdated++;
                else pCreated++;
            } else {
                const res = await prisma.post.upsert({
                    where: { id: detId },
                    update: data,
                    create: { id: detId, ...data }
                });
                if (res.createdAt.getTime() === res.updatedAt.getTime()) pCreated++;
                else pUpdated++;
            }
        } catch(e) {
            console.error("Failed post", detId, e.message);
            pFailed++;
        }
    }

    let rCreated = 0, rUpdated = 0, rUnchanged = 0, rSkipped = 0, rFailed = 0;
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
        
        // Handle subjectId explicitly
        if (finalSubjectId) {
            data.subjectId = finalSubjectId;
        } else if (r.subjectId === null) {
            // Null subject fallback
            data.subjectId = null; 
        }

        try {
            if (isDryRun) {
                if (existingResKeys.has(detId)) rUpdated++;
                else rCreated++;
            } else {
                await prisma.resource.upsert({
                    where: { id: detId },
                    update: data,
                    create: { id: detId, ...data }
                });
                rCreated++;
            }
        } catch (e) {
            console.error("Failed resource", detId, e.message);
            rFailed++;
        }
    }
    
    await prisma.$disconnect();
    console.log(\`Import Complete: Posts: \${pCreated} created, \${pUpdated} updated, \${pFailed} failed. Resources: \${rCreated} created, \${rUpdated} updated, \${rFailed} failed.\`);
}

const action = process.argv[2];
const args = process.argv.slice(3);

if (action === 'extract') extract();
else if (action === 'stage') stage();
else if (action === 'import') importStaging(args);
else if (action === 'verify') verify();
`;

content = content.replace(/async function importStaging\(\) \{[\s\S]*?else if \(action === 'import'\) importStaging\(\);\nelse if \(action === 'verify'\) verify\(\);\n/, replacement);
fs.writeFileSync(file, content);
console.log("Patched migration.js for dry run");
