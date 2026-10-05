const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PrismaClient } = require('@prisma/client');
const { generatePostId, generateResourceId } = require('./migration-identity');

const prisma = new PrismaClient();

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/posts.json'), 'utf8'));
    const resources = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/resources.json'), 'utf8'));
    const phase5 = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase5-decisions.json'), 'utf8'));
    
    // Read and decompress SQL
    const sqlFile = path.join(__dirname, '../wordpress-migration-source/english/entertainlawyers-english.sql.gz');
    const sqlBuffer = fs.readFileSync(sqlFile);
    const sqlContent = zlib.gunzipSync(sqlBuffer).toString('utf8');
    
    // Build maps
    // 1. pdf filename -> dflip ID (from _dflip_data in postmeta)
    const pdfToDflip = {};
    const dflipMetaRegex = /\((\d+),\s*(\d+),\s*'_dflip_data',\s*'([^']+)'\)/g;
    let match;
    while ((match = dflipMetaRegex.exec(sqlContent)) !== null) {
        const dflipId = match[2];
        const metaStr = match[3];
        for (const doc of docs) {
            if (doc.extension === '.pdf' && metaStr.includes(doc.originalFilename)) {
                pdfToDflip[doc.originalFilename] = dflipId;
            }
        }
    }
    
    // 2. dflip ID -> wp post ID (from posts table content)
    const dflipToPost = {};
    const postContentRegex = /\((\d+),\s*[^,]+,\s*'[^']*',\s*'[^']*',\s*'([^']*)'/g;
    // Actually, simpler to just search posts.json for [dflip id="..."]
    for (const p of posts) {
        if (p.content.includes('[dflip id=')) {
            const m = p.content.match(/\[dflip id=\\"(\d+)\\"\]/); // escaping?
            const m2 = p.content.match(/\[dflip id="(\d+)"\]/);
            const m3 = p.content.match(/\[dflip id=(\d+)\]/);
            const id = (m && m[1]) || (m2 && m2[1]) || (m3 && m3[1]);
            if (id) {
                dflipToPost[id] = p;
            }
        }
    }
    
    const dbPosts = await prisma.post.findMany({ select: { id: true, title: true, type: true }});
    const dbResources = await prisma.resource.findMany({ select: { id: true, title: true, type: true, documentId: true }});
    const redirects = await prisma.redirect.findMany({ select: { source: true, destination: true }});
    
    let report = [];
    
    const pdfs = docs.filter(d => d.extension === '.pdf');
    for (const pdf of pdfs) {
        const dflipId = pdfToDflip[pdf.originalFilename];
        const wpPost = dflipId ? dflipToPost[dflipId] : null;
        
        let phase5Dec = null;
        if (wpPost) phase5Dec = phase5.find(d => d.source.wpPostId === wpPost.wordpressPostId);
        
        let neonRecord = null;
        let isResource = false;
        
        if (wpPost) {
            const postId = generatePostId(wpPost.sourceSite, wpPost.wordpressPostId);
            const resId = generateResourceId(wpPost.sourceSite, wpPost.wordpressPostId);
            
            const p = dbPosts.find(p => p.id === postId);
            if (p) neonRecord = { type: 'Post', id: p.id, title: p.title, postType: p.type };
            
            const r = dbResources.find(r => r.id === resId);
            if (r) {
                neonRecord = { type: 'Resource', id: r.id, title: r.title, resourceType: r.type, documentId: r.documentId };
                isResource = true;
            }
        }
        
        let redirs = [];
        if (neonRecord) {
            redirs = redirects.filter(r => r.destination === `/blogs/${neonRecord.id}` || r.destination === `/news/${neonRecord.id}` || r.destination.includes(neonRecord.id));
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
            dflipId: dflipId,
            wpPostId: wpPost ? wpPost.wordpressPostId : null,
            wpType: wpPost ? wpPost.type : null,
            wpTitle: wpPost ? wpPost.title : null,
            phase5Classification: phase5Dec ? phase5Dec.decisionStatus : null,
            phase6StagedAs: wpPost ? (isResource ? 'Resource' : 'Post') : null,
            neonRecord: neonRecord,
            redirects: redirs,
            provisionalDisposition: disposition
        });
    }
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-post-resource-reconciliation.json'), JSON.stringify(report, null, 2));
    
    console.log(`Mapped ${report.filter(r => r.wpPostId !== null).length} out of ${report.length} PDFs.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
