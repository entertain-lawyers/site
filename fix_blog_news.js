const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(null); }
            });
        }).on('error', reject);
    });
};

async function run() {
    const posts = await prisma.post.findMany({
        where: { type: 'NEWS' },
        select: { id: true, title: true, type: true }
    });

    console.log(`Found ${posts.length} NEWS posts in DB.`);

    // Fetch categories map
    const catsData = await fetchJson('https://entertainlawyers.com/wp-json/wp/v2/categories?per_page=100');
    if(!catsData || catsData.length === 0) {
        console.log("Failed to fetch categories");
        return;
    }
    const catMap = {};
    catsData.forEach(c => catMap[c.id] = c.name);

    let mappedCount = 0;
    
    // We need original slug or ID. Since we only have title in `posts`, we can try to search the WP API by search term, or look in posts.json to map DB ID -> WP ID -> fetch API.
    const fs = require('fs');
    const postsLedger = JSON.parse(fs.readFileSync('migration-staging-recovered/posts.json', 'utf8'));

    const updates = [];

    for (let p of posts) {
        // Find in ledger by title (since legacyId might not be in DB)
        const ledgerItem = postsLedger.find(l => l.title === p.title);
        if (!ledgerItem) continue;

        const wpId = ledgerItem.wordpressPostId;
        const wpPost = await fetchJson(`https://entertainlawyers.com/wp-json/wp/v2/posts/${wpId}`);
        
        if (wpPost && wpPost.categories) {
            const catNames = wpPost.categories.map(c => catMap[c] || c).join(', ');
            let proposed = 'NEWS';
            if (catNames.toLowerCase().includes('blog')) proposed = 'BLOG';
            if (catNames.toLowerCase().includes('opinion')) proposed = 'OPINION';

            if (proposed !== 'NEWS') {
                updates.push({
                    id: p.id,
                    wpId,
                    title: p.title,
                    originalCat: catNames,
                    currentType: p.type,
                    proposedType: proposed
                });
            }
        }
    }

    console.log(`Found ${updates.length} posts to correct.`);
    console.table(updates.map(u => ({ WP_ID: u.wpId, Title: u.title.substring(0, 30), Original: u.originalCat, Proposed: u.proposedType })));

    // Write to a SQL file for review/execution
    let sql = "";
    for(let u of updates) {
        sql += `UPDATE "Post" SET type = '${u.proposedType}' WHERE id = '${u.id}';\n`;
    }
    fs.writeFileSync('blog_correction.sql', sql);
    console.log('Wrote blog_correction.sql');
}

run().then(() => prisma.$disconnect()).catch(console.error);
