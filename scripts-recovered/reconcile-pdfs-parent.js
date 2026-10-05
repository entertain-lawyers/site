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
    
    for (const pdf of pdfs) {
        let wpPostId = null;
        
        // Strategy 1: Find _dflip_data meta
        const dflipRegex = new RegExp(`\\((\\d+),\\s*(\\d+),\\s*'_dflip_data',\\s*'[^']*${pdf.originalFilename}[^']*'\\)`, 'g');
        let m1 = dflipRegex.exec(sqlContent);
        let dflipId = null;
        if (m1) {
            dflipId = m1[2];
            // Find [dflip id="dflipId"] in posts.json
            const p = posts.find(p => p.content.includes(`[dflip id="${dflipId}"]`) || p.content.includes(`[dflip id=\\"${dflipId}\\"]`) || p.content.includes(`[dflip id=${dflipId}]`));
            if (p) wpPostId = p.wordpressPostId;
        }
        
        // Strategy 2: Check attachment post_parent in wp_posts
        // We look for wp_posts row where guid or post_name contains the PDF filename
        if (!wpPostId) {
            const safeName = pdf.originalFilename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            // wp_posts schema: INSERT INTO `wp_posts` VALUES (ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count);
            // We just need a rough regex for the insert values
            const attachRegex = new RegExp(`\\((\\d+),\\s*\\d+,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,\\s*(\\d+),\\s*'[^']*${safeName}[^']*',[^,]*,\\s*'attachment'`, 'g');
            let m2 = attachRegex.exec(sqlContent);
            if (m2) {
                const parentId = m2[2];
                if (parentId !== '0') {
                    wpPostId = parseInt(parentId, 10);
                }
            }
        }
        
        const wpPost = wpPostId ? posts.find(p => p.wordpressPostId === wpPostId) : null;
        let phase5Dec = wpPost ? phase5.find(d => d.source.wpPostId === wpPost.wordpressPostId) : null;
        
        let neonRecord = null;
        if (wpPost) {
            const postId = generatePostId(wpPost.sourceSite, wpPost.wordpressPostId);
            const resId = generateResourceId(wpPost.sourceSite, wpPost.wordpressPostId);
            const p = dbPosts.find(p => p.id === postId);
            if (p) neonRecord = { type: 'Post', id: p.id, title: p.title, postType: p.type };
            const r = dbResources.find(r => r.id === resId);
            if (r) neonRecord = { type: 'Resource', id: r.id, title: r.title, resourceType: r.type, documentId: r.documentId };
        }
        
        let disposition = "E. UNRESOLVED_MAPPING";
        if (neonRecord) {
            if (neonRecord.type === 'Post') disposition = "B. SHOULD_BE_RESOURCE";
            if (neonRecord.type === 'Resource') disposition = "C. ALREADY_REPRESENTED_BY_RESOURCE";
        }
        
        report.push({
            pdfFilename: pdf.originalFilename,
            byteSize: pdf.byteSize,
            sha256: pdf.sha256,
            b2Key: `documents/${pdf.sha256}/${pdf.originalFilename}`,
            wpPostId: wpPostId,
            wpTitle: wpPost ? wpPost.title : null,
            wpType: wpPost ? wpPost.type : null,
            phase5Classification: phase5Dec ? phase5Dec.decisionStatus : null,
            phase6StagedAs: neonRecord ? neonRecord.type : null,
            neonRecord: neonRecord,
            redirects: neonRecord ? redirects.filter(r => r.destination.includes(neonRecord.id)) : [],
            provisionalDisposition: disposition
        });
    }
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-post-resource-reconciliation.json'), JSON.stringify(report, null, 2));
    console.log(`Mapped ${report.filter(r => r.wpPostId !== null).length} out of ${report.length} PDFs.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
