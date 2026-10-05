const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { generateResourceId } = require('./migration-identity');

const prisma = new PrismaClient();

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const resources = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/resources.json'), 'utf8'));
    
    // Build a map of WP ID -> Resource
    const wpResMap = {};
    for (const res of resources) {
        wpResMap[`${res.sourceSite}_${res.wordpressPostId}`] = res;
    }
    
    let report = [];
    let pdfManifest = {};
    
    for (const doc of docs) {
        if (doc.extension !== '.pdf') continue;
        
        let resourceTarget = null;
        let dbResource = null;
        if (doc.referencedBy && doc.referencedBy.length > 0) {
            const ref = doc.referencedBy[0];
            const wpRes = wpResMap[`${doc.sourceSite}_${ref.wpId}`];
            if (wpRes) {
                const resourceId = generateResourceId(doc.sourceSite, ref.wpId);
                dbResource = await prisma.resource.findUnique({
                    where: { id: resourceId }
                });
            }
        }
        
        const b2Key = `documents/${doc.sha256}/${doc.originalFilename}`;
        
        report.push({
            pdfFilename: doc.originalFilename,
            byteSize: doc.byteSize,
            sha256: doc.sha256,
            b2Key: b2Key,
            resourceId: dbResource ? dbResource.id : 'UNMAPPED',
            resourceTitle: dbResource ? dbResource.title : 'N/A',
            documentId: dbResource ? dbResource.documentId : 'N/A',
            resourceStatus: dbResource ? dbResource.status : 'N/A'
        });
    }
    
    console.log("\n| PDF Filename | Size (B) | Resource Title | Resource ID | current documentId | Status |");
    console.log("|---|---|---|---|---|---|");
    for (const r of report) {
        console.log(`| ${r.pdfFilename} | ${r.byteSize} | ${r.resourceTitle} | ${r.resourceId} | ${r.documentId === null ? 'NULL' : r.documentId} | ${r.resourceStatus} |`);
    }
}

run().finally(() => prisma.$disconnect());
