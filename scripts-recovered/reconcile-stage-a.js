const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
    const prep = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-final-prep.json'), 'utf8'));
    const partA = prep.filter(p => p.provisionalDisposition === 'B. SHOULD_BE_RESOURCE');
    const partB = prep.filter(p => p.provisionalDisposition === 'D. NEEDS_BUSINESS_DECISION');
    const partC = prep.filter(p => p.provisionalDisposition === 'C. ALREADY_REPRESENTED_BY_RESOURCE');
    
    console.log("=== 11 ARCHIVED POSTS ===");
    const archivedPosts = await prisma.post.findMany({
        where: { id: { in: partA.map(p => p.neonRecord.id) } }
    });
    
    for (const p of partA) {
        const post = archivedPosts.find(db => db.id === p.neonRecord.id);
        const res = await prisma.resource.findUnique({ where: { id: p.targetResourceId } });
        
        console.log(`\nWP ID: ${p.wpPostId}`);
        console.log(`Archived Post ID: ${p.neonRecord.id}`);
        console.log(`Target Resource ID: ${p.targetResourceId}`);
        console.log(`Post Status: ${post ? post.status : 'NOT FOUND'}`);
        console.log(`Resource Exists: ${res ? 'YES' : 'NO'}`);
        console.log(`Resource Type: ${res ? res.type : 'N/A'}`);
        console.log(`Subject ID: ${res ? res.subjectId : 'N/A'}`);
    }

    console.log("\n=== REDIRECTS ===");
    // Get ALL redirects that might point to these posts or resources
    const allRedirects = await prisma.redirect.findMany();
    
    let missingRedirectPost = null;
    let missingRedirectPostTitle = null;
    
    for (const p of partA) {
        const sourcePathRegex = new RegExp(`^https?://(www\\.)?entertainlawyers\\.com/.+`);
        // We know what the original redirects looked like from p.redirects
        const origRedirs = p.redirects || [];
        
        // Find if there's a redirect pointing to the new resource
        const targetRedirs = allRedirects.filter(r => r.destination === `/resources/${p.targetResourceId}`);
        
        console.log(`\nPost ID: ${p.neonRecord.id}`);
        console.log(`Original Redirects Count (from prep): ${origRedirs.length}`);
        console.log(`Current Redirects to Resource: ${targetRedirs.length}`);
        
        if (targetRedirs.length === 0) {
            missingRedirectPost = p.neonRecord.id;
            missingRedirectPostTitle = p.dbPostDetails.title;
            // Did it ever have a redirect?
            const stillPointingToNews = allRedirects.filter(r => r.destination === `/news/${p.neonRecord.id}`);
            console.log(`Still pointing to /news?: ${stillPointingToNews.length}`);
        }
    }
    
    console.log(`\nMissing Redirect Post ID: ${missingRedirectPost} (${missingRedirectPostTitle})`);

    console.log("\n=== 20 RESOURCES ===");
    const targetResIds = [
        ...partA.map(p => p.targetResourceId),
        ...[...new Set(partB.map(p => p.targetResourceId))]
    ];
    const createdResources = await prisma.resource.findMany({
        where: { id: { in: targetResIds } }
    });
    console.log(`Requested: 20`);
    console.log(`Found in DB: ${createdResources.length}`);
    
    console.log("\n=== ONLINE BETTING RESOURCE ===");
    const obRes = await prisma.resource.findUnique({ where: { id: partC[0].neonRecord.id } });
    console.log(`Exists: ${obRes ? 'YES' : 'NO'}`);
    
    console.log("\n=== PDF MAPPING CHECK ===");
    for (const p of prep) {
        const targetId = p.provisionalDisposition === 'B. SHOULD_BE_RESOURCE' || p.provisionalDisposition === 'D. NEEDS_BUSINESS_DECISION' ? p.targetResourceId : p.neonRecord.id;
        
        const res = await prisma.resource.findUnique({ where: { id: targetId } });
        console.log(`PDF: ${p.pdfFilename} -> ResID: ${targetId} -> DocumentLinked: ${res && res.documentId ? 'YES' : 'NO'}`);
    }
}

run().finally(() => prisma.$disconnect());
