const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const STAGING_DIR = path.join(__dirname, '../migration-staging');

async function run() {
    const prisma = new PrismaClient();
    const redirects = [];

    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const reviewQueue = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'review-queue.json'), 'utf-8'));

    // Fetch imported records to map to their new UUIDs
    const dbPosts = await prisma.post.findMany({ where: { metaTitle: { startsWith: 'WP-' } }, select: { id: true, metaTitle: true, type: true } });
    const dbResources = await prisma.resource.findMany({ where: { metaTitle: { startsWith: 'WP-' } }, select: { id: true, metaTitle: true } });

    const importedPostsMap = new Map();
    dbPosts.forEach(p => importedPostsMap.set(p.metaTitle, p));
    const importedResourcesMap = new Map();
    dbResources.forEach(r => importedResourcesMap.set(r.metaTitle, r));

    let validCount = 0;
    let reviewCount = 0;

    const buildOriginalUrl = (site, slug) => {
        if (site === 'nepali') return `https://entertainlawyers.com/nepali/${slug}/`;
        return `https://entertainlawyers.com/${slug}/`; // Fallback for english, assuming root
    };

    const processItem = (item, isResource, isReview) => {
        const metaTitle = `WP-${item.sourceSite}-${item.wordpressPostId}`;
        const originalUrl = buildOriginalUrl(item.sourceSite, item.wordpressSlug);
        let targetPath = null;
        let reviewRequired = isReview;
        let reason = "Imported successfully";

        if (!isReview) {
            if (isResource) {
                const dbRec = importedResourcesMap.get(metaTitle);
                if (dbRec) {
                    targetPath = `/resources/${dbRec.id}`;
                } else {
                    reviewRequired = true;
                    reason = "Resource not found in DB";
                }
            } else {
                const dbRec = importedPostsMap.get(metaTitle);
                if (dbRec) {
                    if (dbRec.type === 'NEWS') targetPath = `/news/${dbRec.id}`;
                    else if (dbRec.type === 'BLOG') targetPath = `/blogs/${dbRec.id}`;
                    else if (dbRec.type === 'FACT') targetPath = `/historical-facts/${dbRec.id}`;
                    else if (dbRec.type.startsWith('NEPALI')) targetPath = `/nepali/post/${dbRec.id}`;
                    else targetPath = `/news/${dbRec.id}`; // fallback
                } else {
                    reviewRequired = true;
                    reason = "Post not found in DB";
                }
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
    reviewQueue.forEach(rq => processItem(rq, false, true)); // Using false for isResource just to trigger the fail path safely

    fs.writeFileSync(path.join(STAGING_DIR, 'redirects.json'), JSON.stringify(redirects, null, 2));

    console.log(`Redirects Staged: Total ${redirects.length} | Valid Targets: ${validCount} | Review Required: ${reviewCount}`);
    await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
