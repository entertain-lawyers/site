const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { generatePostId, generateResourceId } = require('./migration-identity');

const prisma = new PrismaClient();

function normalizeStr(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/posts.json'), 'utf8'));
    const resources = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/resources.json'), 'utf8'));
    const phase5 = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase5-decisions.json'), 'utf8'));
    
    const dbPosts = await prisma.post.findMany({ select: { id: true, title: true, type: true }});
    const dbResources = await prisma.resource.findMany({ select: { id: true, title: true, type: true }});
    const redirects = await prisma.redirect.findMany({ select: { source: true, destination: true }});
    
    let report = [];
    
    const pdfs = docs.filter(d => d.extension === '.pdf');
    for (const pdf of pdfs) {
        const normPdf = normalizeStr(pdf.originalFilename.replace('.pdf', ''));
        
        let foundWpPost = null;
        let isResource = false;
        
        // 1. Search posts.json
        for (const p of posts) {
            const normTitle = normalizeStr(p.title);
            if (normTitle === normPdf || normPdf.includes(normTitle) || normTitle.includes(normPdf)) {
                foundWpPost = p;
                break;
            }
            if (p.content.includes(pdf.originalFilename)) {
                foundWpPost = p;
                break;
            }
            if (normTitle.substring(0, 10) === normPdf.substring(0, 10)) {
                foundWpPost = p;
            }
        }
        
        // 2. Search resources.json
        if (!foundWpPost) {
            for (const r of resources) {
                const normTitle = normalizeStr(r.title);
                if (normTitle === normPdf || normPdf.includes(normTitle) || normTitle.includes(normPdf) || normTitle.substring(0, 10) === normPdf.substring(0, 10)) {
                    foundWpPost = r;
                    isResource = true;
                    break;
                }
            }
        }
        
        let phase5Dec = null;
        if (foundWpPost) {
            phase5Dec = phase5.find(d => d.source.wpPostId === foundWpPost.wordpressPostId);
        }
        
        let neonRecord = null;
        if (foundWpPost) {
            const postId = generatePostId(foundWpPost.sourceSite, foundWpPost.wordpressPostId);
            const resId = generateResourceId(foundWpPost.sourceSite, foundWpPost.wordpressPostId);
            
            const p = dbPosts.find(p => p.id === postId);
            if (p) neonRecord = { type: 'Post', id: p.id, title: p.title, postType: p.type };
            
            const r = dbResources.find(r => r.id === resId);
            if (r) neonRecord = { type: 'Resource', id: r.id, title: r.title, resourceType: r.type };
        }
        
        let redirs = [];
        if (neonRecord) {
            redirs = redirects.filter(r => r.destination === `/blogs/${neonRecord.id}` || r.destination === `/news/${neonRecord.id}` || r.destination.includes(neonRecord.id));
        }

        report.push({
            pdfFilename: pdf.originalFilename,
            byteSize: pdf.byteSize,
            sha256: pdf.sha256,
            b2Key: `documents/${pdf.sha256}/${pdf.originalFilename}`,
            wpPostId: foundWpPost ? foundWpPost.wordpressPostId : null,
            wpTitle: foundWpPost ? foundWpPost.title : null,
            wpType: foundWpPost ? foundWpPost.type : null,
            phase5Classification: phase5Dec ? phase5Dec.decisionStatus : null,
            phase6StagedAs: foundWpPost ? (isResource ? 'Resource' : 'Post') : null,
            neonRecord: neonRecord,
            redirects: redirs
        });
    }
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-post-resource-reconciliation.json'), JSON.stringify(report, null, 2));
    console.log("JSON generated.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
