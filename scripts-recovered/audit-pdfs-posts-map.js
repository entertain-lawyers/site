const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

function normalizeStr(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const posts = await prisma.post.findMany({
        select: { id: true, title: true, type: true, status: true, content: true }
    });
    
    let report = [];
    
    for (const doc of docs) {
        if (doc.extension !== '.pdf') continue;
        
        let bestMatch = null;
        const normPdf = normalizeStr(doc.originalFilename.replace('.pdf', ''));
        
        for (const p of posts) {
            const normTitle = normalizeStr(p.title);
            if (normTitle === normPdf || normPdf.includes(normTitle) || normTitle.includes(normPdf)) {
                bestMatch = p;
                break;
            }
            if (p.content.includes(doc.originalFilename)) {
                bestMatch = p;
                break;
            }
        }
        
        if (!bestMatch) {
            // Check if there's a dflip shortcode that could link to this
            for (const p of posts) {
                const normTitle = normalizeStr(p.title);
                if (normTitle.substring(0, 10) === normPdf.substring(0, 10)) {
                    bestMatch = p;
                    break;
                }
            }
        }
        
        report.push({
            pdfFilename: doc.originalFilename,
            postId: bestMatch ? bestMatch.id : 'UNMAPPED',
            postTitle: bestMatch ? bestMatch.title : 'N/A'
        });
    }

    console.log("\n| PDF Filename | Post Title | Post ID |");
    console.log("|---|---|---|");
    for (const r of report) {
        console.log(`| ${r.pdfFilename} | ${r.postTitle} | ${r.postId} |`);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
