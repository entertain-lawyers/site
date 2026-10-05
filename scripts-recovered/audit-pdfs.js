const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { generateResourceId } = require('./migration-identity');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function run() {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    
    let report = [];
    let pdfManifest = {};
    
    for (const doc of docs) {
        if (doc.extension !== '.pdf') continue;
        
        let resourceTarget = null;
        if (doc.referencedBy && doc.referencedBy.length > 0) {
            const ref = doc.referencedBy[0];
            const resourceId = generateResourceId(doc.sourceSite, ref.wpId);
            
            resourceTarget = await prisma.resource.findUnique({
                where: { id: resourceId }
            });
        }
        
        const b2Key = `documents/${doc.sha256}/${doc.originalFilename}`;
        
        report.push({
            pdfFilename: doc.originalFilename,
            byteSize: doc.byteSize,
            sha256: doc.sha256,
            b2Key: b2Key,
            resourceId: resourceTarget ? resourceTarget.id : 'UNMAPPED',
            resourceTitle: resourceTarget ? resourceTarget.title : 'N/A',
            documentId: resourceTarget ? resourceTarget.documentId : 'N/A',
            resourceStatus: resourceTarget ? resourceTarget.status : 'N/A'
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
            resourceId: resourceTarget ? resourceTarget.id : null,
            error: null
        };
    }
    
    // Check duplicates
    const b2Keys = Object.keys(pdfManifest);
    const duplicates = b2Keys.length !== report.length;
    console.log(`Duplicate keys? ${duplicates}`);
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/pdf_manifest.json'), JSON.stringify(pdfManifest, null, 2));
    
    // Check if image manifest contains PDFs
    const imgManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/upload_manifest.json'), 'utf8'));
    let inImageManifest = 0;
    for (const key of b2Keys) {
        if (imgManifest[key]) inImageManifest++;
    }
    console.log(`PDFs found in Image Manifest? ${inImageManifest}`);

    // Print markdown table
    console.log("\n| PDF Filename | Size (B) | Resource Title | Resource ID | current documentId | Status |");
    console.log("|---|---|---|---|---|---|");
    for (const r of report) {
        console.log(`| ${r.pdfFilename} | ${r.byteSize} | ${r.resourceTitle} | ${r.resourceId} | ${r.documentId === null ? 'NULL' : r.documentId} | ${r.resourceStatus} |`);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
