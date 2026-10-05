const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { generatePostId } = require('./scripts-recovered/migration-identity.js');

async function run() {
    const prisma = new PrismaClient();
    
    // Get all DB posts
    const dbPosts = await prisma.post.findMany();
    
    // Get expected from artifacts
    const STAGING_DIR = path.join(__dirname, 'migration-staging-recovered');
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const reviewQueue = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'review-queue.json'), 'utf-8'));
    
    const postsMap = new Map();
    posts.forEach(p => {
        // We know they were skipped if type was NEPALI_SAMANYA_SAMACHAR
        if (p.type !== 'NEPALI_SAMANYA_SAMACHAR') {
            const uuid = generatePostId(p.sourceSite, p.wordpressPostId);
            postsMap.set(uuid, p);
        }
    });
    
    const reviewMap = new Map();
    reviewQueue.forEach(rq => {
        const uuid = generatePostId(rq.sourceSite, rq.wordpressPostId);
        reviewMap.set(uuid, rq);
    });

    let legit = 0;
    let unexpected = 0;
    let reviewHeldInserted = 0;
    
    const countsById = new Map();
    
    const reportLines = [];
    
    for (const dbP of dbPosts) {
        countsById.set(dbP.id, (countsById.get(dbP.id) || 0) + 1);
        
        const isLegit = postsMap.has(dbP.id);
        const isReview = reviewMap.has(dbP.id);
        
        let wpId = "Unknown";
        let locale = "Unknown";
        
        if (isLegit) {
            legit++;
            const p = postsMap.get(dbP.id);
            wpId = p.wordpressPostId;
            locale = p.sourceSite;
        } else if (isReview) {
            reviewHeldInserted++;
            const p = reviewMap.get(dbP.id);
            wpId = p.wordpressPostId;
            locale = p.sourceSite;
        } else {
            unexpected++;
        }
        
        reportLines.push(`- DB ID: ${dbP.id} | WP ID: ${wpId} | Locale: ${locale} | Title: "${dbP.title.substring(0, 30)}..." | Status: ${dbP.status} | Created: ${dbP.createdAt.toISOString()} | Updated: ${dbP.updatedAt.toISOString()} | Legit: ${isLegit}`);
    }
    
    let duplicates = 0;
    for (const [id, count] of countsById.entries()) {
        if (count > 1) duplicates += (count - 1);
    }
    
    const summary = `
Accidental posts detected: ${dbPosts.length}
Legitimate approved migration records: ${legit}
Review-held records accidentally inserted: ${reviewHeldInserted}
Duplicates: ${duplicates}
Unexpected records: ${unexpected}
`;
    
    fs.writeFileSync('docs/PHASE6_ACCIDENTAL_73_POST_FORENSIC.md', summary + "\n## Details\n" + reportLines.join('\n'));
    console.log(summary);
    
    // Check if any other records were created
    const others = {
        Users: await prisma.user.count(),
        Resources: await prisma.resource.count(),
        Semesters: await prisma.semester.count(),
        Subjects: await prisma.subject.count(),
        Units: await prisma.unit.count(),
        Documents: await prisma.document.count()
    };
    console.log("Other tables:", JSON.stringify(others));
    
    await prisma.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
