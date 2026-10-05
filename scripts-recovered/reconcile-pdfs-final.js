const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PrismaClient } = require('@prisma/client');
const { generatePostId, generateResourceId } = require('./migration-identity');

const prisma = new PrismaClient();
function normalizeStr(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, ''); }

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/posts.json'), 'utf8'));
    const phase5 = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase5-decisions.json'), 'utf8'));
    
    // Read and decompress SQL
    const sqlFile = path.join(__dirname, '../wordpress-migration-source/english/entertainlawyers-english.sql.gz');
    const sqlBuffer = fs.readFileSync(sqlFile);
    const sqlContent = zlib.gunzipSync(sqlBuffer).toString('utf8');
    
    const dbPosts = await prisma.post.findMany({ select: { id: true, title: true, type: true }});
    const dbResources = await prisma.resource.findMany({ select: { id: true, title: true, type: true, documentId: true }});
    const redirects = await prisma.redirect.findMany({ select: { source: true, destination: true }});
    
    const pdfs = docs.filter(d => d.extension === '.pdf');
    let report = [];
    
    // Parse ALL wp_posts into a map for fast lookup
    // (ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count)
    // We can extract ID, post_title, post_name(slug), post_parent, post_type, post_status
    const wpPostsDb = {};
    const postsRegex = /\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(\d+),\s*'([^']*)',\s*\d+,\s*'([^']*)'/g;
    let match;
    while ((match = postsRegex.exec(sqlContent)) !== null) {
        wpPostsDb[match[1]] = {
            id: match[1],
            title: match[2],
            status: match[3],
            slug: match[4],
            parentId: match[5],
            guid: match[6],
            type: match[7]
        };
    }
    
    for (const pdf of pdfs) {
        const safeName = pdf.originalFilename;
        let wpPostId = null;
        let originalSource = null;
        
        // Strategy 1: Find _dflip_data meta
        const dflipRegex = new RegExp(`\\((\\d+),\\s*(\\d+),\\s*'_dflip_data',\\s*'[^']*${safeName}[^']*'\\)`, 'g');
        let m1 = dflipRegex.exec(sqlContent);
        if (m1) {
            const dflipId = m1[2];
            // Find who contains [dflip id="dflipId"]
            // Search in wpPostsDb
            for (const pid in wpPostsDb) {
                const wp = wpPostsDb[pid];
                // we didn't extract content easily, so check posts.json
            }
            const p = posts.find(p => p.content.includes(`[dflip id="${dflipId}"]`) || p.content.includes(`[dflip id=\\"${dflipId}\\"]`) || p.content.includes(`[dflip id=${dflipId}]`));
            if (p) wpPostId = p.wordpressPostId;
        }
        
        // Strategy 2: Check attachment post_parent in wp_posts
        if (!wpPostId) {
            // Find attachment by GUID
            for (const pid in wpPostsDb) {
                const wp = wpPostsDb[pid];
                if (wp.type === 'attachment' && wp.guid.includes(safeName)) {
                    if (wp.parentId !== '0') {
                        wpPostId = parseInt(wp.parentId, 10);
                    }
                }
            }
        }
        
        if (wpPostId) {
            originalSource = wpPostsDb[wpPostId.toString()];
        }
        
        const wpPost = wpPostId ? posts.find(p => p.wordpressPostId === wpPostId) : null;
        let phase5Dec = wpPost ? phase5.find(d => d.source.wpPostId === wpPost.wordpressPostId) : null;
        
        let neonRecord = null;
        if (wpPostId) {
            const postId = generatePostId(pdf.sourceSite, wpPostId);
            const resId = generateResourceId(pdf.sourceSite, wpPostId);
            const p = dbPosts.find(p => p.id === postId);
            if (p) neonRecord = { type: 'Post', id: p.id, title: p.title, dbType: p.type };
            const r = dbResources.find(r => r.id === resId);
            if (r) neonRecord = { type: 'Resource', id: r.id, title: r.title, dbType: r.type, documentId: r.documentId };
        }
        
        let disposition = "E. UNRESOLVED_MAPPING";
        if (neonRecord) {
            if (neonRecord.type === 'Post') disposition = "B. SHOULD_BE_RESOURCE";
            if (neonRecord.type === 'Resource') disposition = "C. ALREADY_REPRESENTED_BY_RESOURCE";
        } else if (wpPostId && !neonRecord) {
            disposition = "D. NEEDS_BUSINESS_DECISION"; // Skipped or deleted
        }
        
        let redirs = [];
        if (neonRecord) {
            redirs = redirects.filter(r => r.destination.includes(neonRecord.id));
        }
        
        report.push({
            pdfFilename: pdf.originalFilename,
            byteSize: pdf.byteSize,
            sha256: pdf.sha256,
            b2Key: `documents/${pdf.sha256}/${pdf.originalFilename}`,
            wpPostId: wpPostId,
            wpTitle: originalSource ? originalSource.title : null,
            wpType: originalSource ? originalSource.type : null,
            wpStatus: originalSource ? originalSource.status : null,
            wpSlug: originalSource ? originalSource.slug : null,
            phase5Classification: phase5Dec ? phase5Dec.decisionStatus : null,
            phase6StagedAs: neonRecord ? neonRecord.type : null,
            neonRecord: neonRecord,
            redirects: redirs,
            provisionalDisposition: disposition
        });
    }
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-post-resource-reconciliation.json'), JSON.stringify(report, null, 2));
    console.log(`Mapped ${report.filter(r => r.wpPostId !== null).length} out of ${report.length} PDFs.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
