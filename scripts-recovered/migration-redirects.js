const fs = require('fs');
const path = require('path');

const STAGING_DIR = path.join(__dirname, '../migration-staging-recovered');
const { generatePostId, generateResourceId } = require('./migration-identity.js');

async function run() {
    const redirects = [];

    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const reviewQueue = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'review-queue.json'), 'utf-8'));

    let validCount = 0;
    let reviewCount = 0;

    const buildOriginalUrl = (site, slug) => {
        if (site === 'nepali') return `https://entertainlawyers.com/nepali/${slug}/`;
        return `https://entertainlawyers.com/${slug}/`; // Fallback for english, assuming root
    };

    const processItem = (item, isResource, isReview) => {
        const originalUrl = buildOriginalUrl(item.sourceSite, item.wordpressSlug);
        let targetPath = null;
        let reviewRequired = isReview;
        let reason = "Imported successfully";

        if (!isReview) {
            if (isResource) {
                targetPath = `/resources/${generateResourceId(item.sourceSite, item.wordpressPostId)}`;
            } else {
                if (item.type === 'NEWS') targetPath = `/news/${generatePostId(item.sourceSite, item.wordpressPostId)}`;
                else if (item.type === 'BLOG') targetPath = `/blogs/${generatePostId(item.sourceSite, item.wordpressPostId)}`;
                else if (item.type === 'FACT') targetPath = `/historical-facts/${generatePostId(item.sourceSite, item.wordpressPostId)}`;
                else if (item.type && item.type.startsWith('NEPALI')) targetPath = `/nepali/post/${generatePostId(item.sourceSite, item.wordpressPostId)}`;
                else targetPath = `/news/${generatePostId(item.sourceSite, item.wordpressPostId)}`; // fallback
            }
        } else {
            reason = "Held in review queue (taxonomic mapping unresolved)";
        }

        if (targetPath) validCount++;
        else reviewCount++;

        redirects.push({
            sourceSite: item.sourceSite,
            wordpressPostId: item.wordpressPostId,
            originalUrl,
            originalSlug: item.wordpressSlug,
            targetPath,
            statusCode: 301,
            reviewRequired,
            reason
        });
    };

    posts.forEach(p => processItem(p, false, false));
    resources.forEach(r => processItem(r, true, false));
    
    reviewQueue.forEach(rq => {
        processItem(rq, false, true)
    }); 

    fs.writeFileSync(path.join(STAGING_DIR, 'redirects.json'), JSON.stringify(redirects, null, 2));

    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    let rCreated = 0, rUpdated = 0;
    
    for (const r of redirects) {
        if (!r.reviewRequired && r.targetPath) {
            const res = await prisma.redirect.upsert({
                where: { source: r.originalUrl },
                update: {
                    destination: r.targetPath,
                    statusCode: r.statusCode,
                    updatedAt: new Date()
                },
                create: {
                    id: require('crypto').randomUUID(),
                    source: r.originalUrl,
                    destination: r.targetPath,
                    statusCode: r.statusCode,
                    updatedAt: new Date()
                }
            });
            if (res.createdAt.getTime() === res.updatedAt.getTime()) rCreated++;
            else rUpdated++;
        }
    }
    await prisma.$disconnect();
    console.log(`Database Import: ${rCreated} created, ${rUpdated} updated.`);

    console.log(`Redirects Staged: Total ${redirects.length} | Valid Targets: ${validCount} | Review Required: ${reviewCount}`);
}

run().catch(e => { console.error(e); process.exit(1); });
