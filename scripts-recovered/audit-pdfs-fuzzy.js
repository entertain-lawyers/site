const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

function normalizeStr(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const resources = await prisma.resource.findMany({
        select: { id: true, title: true, documentId: true, status: true }
    });
    
    let report = [];
    let pdfManifest = {};
    
    for (const doc of docs) {
        if (doc.extension !== '.pdf') continue;
        
        let bestMatch = null;
        let bestScore = 0;
        
        const normPdf = normalizeStr(doc.originalFilename.replace('.pdf', ''));
        
        for (const res of resources) {
            const normTitle = normalizeStr(res.title);
            if (normTitle === normPdf || normPdf.includes(normTitle) || normTitle.includes(normPdf)) {
                bestMatch = res;
                break;
            }
        }
        
        // If not found, try a looser match (common prefix)
        if (!bestMatch) {
            for (const res of resources) {
                const normTitle = normalizeStr(res.title);
                if (normTitle.substring(0, 10) === normPdf.substring(0, 10)) {
                    bestMatch = res;
                    break;
                }
            }
        }
        
        const b2Key = `documents/${doc.sha256}/${doc.originalFilename}`;
        
        report.push({
            pdfFilename: doc.originalFilename,
            byteSize: doc.byteSize,
            sha256: doc.sha256,
            b2Key: b2Key,
            resourceId: bestMatch ? bestMatch.id : 'UNMAPPED',
            resourceTitle: bestMatch ? bestMatch.title : 'N/A',
            documentId: bestMatch ? bestMatch.documentId : 'N/A',
            resourceStatus: bestMatch ? bestMatch.status : 'N/A'
        });
        
        pdfManifest[b2Key] = {
            sourcePath: doc.originalRelativePath,
            sourceLocale: doc.sourceSite,
            sourceFilename: doc.originalFilename,
            sha256: doc.sha256,
            byteSize: doc.byteSize,
            mimeType: doc.mimeType,
            b2Key: b2Key,
            status: 'PENDING',
            resourceId: bestMatch ? bestMatch.id : null,
            error: null
        };
    }
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/pdf_manifest.json'), JSON.stringify(pdfManifest, null, 2));

    console.log("\n| PDF Filename | Size (B) | Resource Title | Resource ID | current documentId | Status |");
    console.log("|---|---|---|---|---|---|");
    for (const r of report) {
        console.log(`| ${r.pdfFilename} | ${r.byteSize} | ${r.resourceTitle} | ${r.resourceId} | ${r.documentId === null ? 'NULL' : r.documentId} | ${r.resourceStatus} |`);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
