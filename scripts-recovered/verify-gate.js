const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const STAGING_DIR = path.join(__dirname, '../migration-staging-recovered');

function computeHash(filePath) {
    if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function run() {
    console.log("=== PHASE 6 READ-ONLY ARTIFACT VERIFICATION ===\n");

    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const reviewQueue = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'review-queue.json'), 'utf-8'));
    const media = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'media.json'), 'utf-8'));
    const documents = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'documents.json'), 'utf-8'));
    const redirects = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'redirects.json'), 'utf-8'));
    const phase5 = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), 'utf-8'));
    
    // CONTENT RECONCILIATION
    console.log("--- CONTENT RECONCILIATION ---");
    console.log(`Posts imported: ${posts.length}`);
    console.log(`Resources imported: ${resources.length}`);
    console.log(`Total imported content: ${posts.length + resources.length}`);
    console.log(`Review queue: ${reviewQueue.length}`);
    
    let approvedSubject = 0, nullSubject = 0;
    resources.forEach(r => { if (r.subjectId === null) nullSubject++; else approvedSubject++; });
    
    console.log(`\nPhase 5 mappings embedded in resources.json:`);
    console.log(`APPROVED_EXISTING_SUBJECT: ${approvedSubject}`);
    console.log(`NULL_SUBJECT_CANDIDATE: ${nullSubject}`);
    
    let needsBiz = 0, newSubReq = 0, others = 0;
    reviewQueue.forEach(rq => {
        if (rq.reviewStatus === 'NEEDS_BUSINESS_DECISION') needsBiz++;
        else if (rq.reviewStatus === 'NEW_SUBJECT_REQUIRED') newSubReq++;
        else others++;
    });
    console.log(`NEEDS_BUSINESS_DECISION: ${needsBiz}`);
    console.log(`NEW_SUBJECT_REQUIRED: ${newSubReq}`);
    if (others > 0) console.log(`OTHER in review queue: ${others}`);
    
    console.log(`Total content/review records: ${posts.length + resources.length + reviewQueue.length}`);
    
    // MEDIA RECONCILIATION
    console.log("\n--- MEDIA RECONCILIATION ---");
    let originalImgs = 0, derivatives = 0, totalMediaItems = media.length + documents.length;
    let missingReferences = [], resolvedReferences = 0;
    
    media.forEach(m => {
        if (m.isDerivative) derivatives++;
        else originalImgs++;
        if (m.referencedBy && m.referencedBy.length > 0) {
            if (m.isMissing) missingReferences.push(m);
            else resolvedReferences++;
        }
    });
    console.log(`Total media items (media.json + documents.json): ${totalMediaItems}`);
    console.log(`media.json count: ${media.length}`);
    console.log(`Original images: ${originalImgs}`);
    console.log(`Generated derivatives: ${derivatives}`);
    console.log(`PDFs count (documents.json): ${documents.length}`);
    
    console.log(`\n--- INLINE MEDIA ---`);
    console.log(`Successfully resolved references: ${resolvedReferences}`);
    console.log(`Missing references: ${missingReferences.length}`);
    if (missingReferences.length > 0) {
        console.log(`Missing reference detail: File '${missingReferences[0].originalFilename}' | Source: ${JSON.stringify(missingReferences[0].referencedBy)}`);
    }

    // REDIRECT RECONCILIATION
    console.log("\n--- REDIRECT RECONCILIATION ---");
    let validTargets = 0, reviewRedirects = 0, nullTargets = 0;
    redirects.forEach(r => {
        if (r.reviewRequired) reviewRedirects++;
        else validTargets++;
        if (r.targetPath === null) nullTargets++;
    });
    console.log(`Valid redirect targets: ${validTargets}`);
    console.log(`Review redirects: ${reviewRedirects}`);
    console.log(`Redirects with targetPath=null: ${nullTargets}`);
    
    // PHASE 5 INTEGRITY
    console.log("\n--- PHASE 5 INTEGRITY ---");
    const phase5Hash = computeHash(path.join(STAGING_DIR, 'phase5-decisions.json'));
    console.log(`phase5-decisions.json SHA-256: ${phase5Hash}`);
    
    // DATABASE VERIFICATION
    console.log("\n--- DATABASE VERIFICATION ---");
    const prisma = new PrismaClient();
    try {
        const dbPosts = await prisma.post.count({ where: { metaTitle: { startsWith: 'WP-' } }});
        const dbResources = await prisma.resource.count({ where: { metaTitle: { startsWith: 'WP-' } }});
        const dbNullResources = await prisma.resource.count({ where: { metaTitle: { startsWith: 'WP-' }, subjectId: null } });
        const dbApprResources = dbResources - dbNullResources;
        
        console.log(`Posts in DB: ${dbPosts}`);
        console.log(`Resources in DB: ${dbResources}`);
        console.log(`NULL subject Resources in DB: ${dbNullResources}`);
        console.log(`APPROVED_EXISTING_SUBJECT Resources in DB: ${dbApprResources}`);
        
        const uncategorized = await prisma.subject.findFirst({ where: { name: { contains: 'Uncategorized', mode: 'insensitive' } } });
        if (uncategorized) {
            console.log(`WARNING: Found "Uncategorized" subject: ${uncategorized.id}`);
        } else {
            console.log(`No "Uncategorized" Subject exists.`);
        }
    } catch (e) {
        console.log(`Database verification failed: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
    
    // ARTIFACT HASHES
    console.log("\n--- FINAL ARTIFACT HASHES ---");
    const artifacts = [
        'posts.json', 'resources.json', 'media.json', 'documents.json', 
        'redirects.json', 'review-queue.json', 'errors.json', 'manifest.json'
    ];
    artifacts.forEach(f => {
        console.log(`${f}: ${computeHash(path.join(STAGING_DIR, f))}`);
    });
    
    console.log("\nVerification complete.");
}

run();
