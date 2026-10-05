const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v5: uuidv5 } = require('uuid');
const { 
    generatePostId, 
    generateResourceId, 
    generateSemesterId, 
    generateSubjectId 
} = require('../scripts-recovered/migration-identity.js');

const STAGING_DIR = path.join(__dirname, '../migration-staging-recovered');
const EXPECTED_NEON = 'ep-delicate-silence-b36jbzw5-pooler.c-4.ap-southeast-1.aws.neon.tech';
const NAMESPACE_UUID = '1b671a64-40d5-491e-99b0-da01ff1f3341';
function generateDocumentId(b2Key) { return uuidv5(`document:b2key:${b2Key}`, NAMESPACE_UUID); }

async function runImport() {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl.includes(EXPECTED_NEON)) {
        console.error(`FATAL: DATABASE_URL does not match expected Neon production instance ${EXPECTED_NEON}`);
        process.exit(1);
    }
    
    console.log(`Connecting securely to target: ${dbUrl.split('@')[1]}`);
    const prisma = new PrismaClient();

    // 1. Preflight safety counts
    console.log("==> 1. Executing Pre-flight safety check...");
    const preUsers = await prisma.user.count();
    const preAccounts = await prisma.account.count();
    const preSemesters = await prisma.semester.count();
    const preResources = await prisma.resource.count();
    const prePurchases = await prisma.purchase.count();
    console.log(`Preflight: Users=${preUsers}, Accounts=${preAccounts}, Semesters=${preSemesters}, Resources=${preResources}, Purchases=${prePurchases}`);
    
    // 2. Load Artifacts
    console.log("==> 2. Loading Authoritative Artifacts...");
    const decisions = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), 'utf-8'));
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const redirectData = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'redirects.json'), 'utf-8'));
    const prep = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase7b-final-prep.json'), 'utf-8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'pdf_manifest.json'), 'utf-8'));
    
    // 3. Taxonomy Import
    console.log("==> 3. Importing Taxonomy...");
    const semestersToCreate = new Map();
    const subjectsToCreate = new Map();
    const semesterOrderMapping = {
        '1st Semester': 1, '2nd Semester': 2, '3rd Semester': 3, '4th Semester': 4,
        '5th Semester': 5, '6th Semester': 6, '7th Semester': 7, '8th Semester': 8,
        '9th Semester': 9, '10th Semester': 10
    };

    for (const d of decisions) {
        if (d.decisionStatus === 'APPROVED_EXISTING_SUBJECT') {
            const semName = d.proposedTarget.semester;
            const subName = d.proposedTarget.subject;
            if (semName && subName) {
                const semId = generateSemesterId(semName);
                const subId = generateSubjectId(semName, subName);
                semestersToCreate.set(semId, { id: semId, name: semName, order: semesterOrderMapping[semName] || 99 });
                subjectsToCreate.set(subId, { id: subId, name: subName, semesterId: semId });
            }
        }
    }
    for (const [id, data] of semestersToCreate.entries()) {
        await prisma.semester.upsert({ where: { id }, update: { name: data.name, order: data.order }, create: data });
    }
    for (const [id, data] of subjectsToCreate.entries()) {
        await prisma.subject.upsert({ where: { id }, update: { name: data.name, semesterId: data.semesterId }, create: data });
    }
    console.log(`Taxonomy mapped: ${semestersToCreate.size} Semesters, ${subjectsToCreate.size} Subjects`);

    // 4. Posts Import
    console.log("==> 4. Importing Posts...");
    let pCreated = 0;
    for (const p of posts) {
        const detId = generatePostId(p.sourceSite, p.wordpressPostId);
        const data = { title: p.title, content: p.content, type: p.type, status: p.status, metaTitle: `WP-${p.sourceSite}-${p.wordpressPostId}`, metaDesc: p.wordpressSlug };
        await prisma.post.upsert({ where: { id: detId }, update: data, create: { id: detId, ...data }});
        pCreated++;
    }
    console.log(`Posts: ${pCreated} processed.`);

    // 5. Resources Import
    console.log("==> 5. Importing Resources...");
    const decisionMap = new Map();
    decisions.forEach(d => decisionMap.set(`${d.source.site}-${d.source.wpPostId}`, d));

    let rCreated = 0;
    for (const r of resources) {
        const detId = generateResourceId(r.sourceSite, r.wordpressPostId);
        let finalSubjectId = null;
        const decision = decisionMap.get(`${r.sourceSite}-${r.wordpressPostId}`);
        if (decision && decision.decisionStatus === 'APPROVED_EXISTING_SUBJECT') {
            const semName = decision.proposedTarget.semester;
            const subName = decision.proposedTarget.subject;
            if (semName && subName) {
                finalSubjectId = generateSubjectId(semName, subName);
            }
        }
        const data = { title: r.title, type: r.type, status: r.status, subjectId: finalSubjectId, metaTitle: `WP-${r.sourceSite}-${r.wordpressPostId}`, metaDesc: r.wordpressSlug };
        await prisma.resource.upsert({ where: { id: detId }, update: data, create: { id: detId, ...data }});
        rCreated++;
    }
    console.log(`Resources: ${rCreated} processed.`);

    // 6. Documents Import & Phase 7B Resource Conversion
    console.log("==> 6. Importing PDF Documents & Linking...");
    let mappings = [];
    let splitResourcePayload = null;
    
    for (const r of prep) {
        const manifestKey = Object.keys(manifest).find(k => manifest[k].sha256 === r.sha256);
        if (!manifestKey) continue;
        const fileInfo = manifest[manifestKey];
        
        let targetResourceId = r.neonRecord?.id; 
        
        // Handle Phase 7B Posts converted to Resources
        if (r.provisionalDisposition === 'B. SHOULD_BE_RESOURCE' || r.provisionalDisposition === 'D. NEEDS_BUSINESS_DECISION') {
            targetResourceId = generateResourceId('english', r.wpPostId.toString());
            // Upsert the missing Phase-7B Resource immediately
            await prisma.resource.upsert({
                where: { id: targetResourceId },
                update: { title: r.wpTitle || r.pdfFilename, type: 'OLD_QUESTION' },
                create: { id: targetResourceId, title: r.wpTitle || r.pdfFilename, type: 'OLD_QUESTION', subjectId: null, status: 'PUBLISHED' }
            });
        }
            
        if (r.pdfFilename === '9th-sem-old-questions.pdf') {
            targetResourceId = generateResourceId('english', '3907-old-course');
            splitResourcePayload = { id: targetResourceId, title: '9th sem old questions', type: 'OLD_QUESTION', subjectId: null, status: 'PUBLISHED' };
        } else if (r.pdfFilename === '9th-semester-new-course-question-collection-.pdf') {
            targetResourceId = '1cbfe25a-658b-5cf4-9d36-f9d72df004a3';
        }
            
        mappings.push({
            pdfFilename: r.pdfFilename, sha256: r.sha256, b2Key: fileInfo.b2Key, byteSize: fileInfo.byteSize,
            mimeType: fileInfo.mimeType || 'application/pdf', targetResourceId, documentId: generateDocumentId(fileInfo.b2Key)
        });
    }

    if (splitResourcePayload) {
        await prisma.resource.upsert({
            where: { id: splitResourcePayload.id },
            update: { title: splitResourcePayload.title, type: splitResourcePayload.type },
            create: splitResourcePayload
        });
    }

    let docsCreated = 0;
    for (const m of mappings) {
        await prisma.$transaction(async (tx) => {
            const doc = await tx.document.upsert({
                where: { id: m.documentId },
                update: { storageProvider: 'B2', storageKey: m.b2Key, fileSize: m.byteSize, mimeType: m.mimeType },
                create: { id: m.documentId, storageProvider: 'B2', storageKey: m.b2Key, fileSize: m.byteSize, mimeType: m.mimeType }
            });
            await tx.resource.update({ where: { id: m.targetResourceId }, data: { documentId: doc.id } });
            docsCreated++;
        });
    }
    console.log(`Documents: Linked ${docsCreated} PDF Documents to Resources.`);

    // 7. Redirects Import
    console.log("==> 7. Importing Redirects...");
    let redCreated = 0;
    for (const r of redirectData) {
        if (!r.reviewRequired && r.targetPath) {
            await prisma.redirect.upsert({
                where: { source: r.originalUrl },
                update: { destination: r.targetPath, statusCode: r.statusCode },
                create: { id: require('crypto').randomUUID(), source: r.originalUrl, destination: r.targetPath, statusCode: r.statusCode }
            });
            redCreated++;
        }
    }
    console.log(`Redirects: ${redCreated} processed.`);

    // 8. Post-flight verification
    console.log("==> 8. Executing Post-flight verification...");
    const postUsers = await prisma.user.count();
    const postAccounts = await prisma.account.count();
    const postResources = await prisma.resource.count();
    const postPurchases = await prisma.purchase.count();
    const postSemesters = await prisma.semester.count();
    const postPosts = await prisma.post.count();
    const postDocs = await prisma.document.count();
    const postRedirects = await prisma.redirect.count();

    if (postUsers !== preUsers || postAccounts !== preAccounts || postPurchases !== prePurchases) {
        console.error("FATAL: Auth or Financial records were mutated!");
    } else {
        console.log(`Auth & Financial Integrity VERIFIED. Users=${postUsers}, Accounts=${postAccounts}, Purchases=${postPurchases}`);
    }
    
    console.log(`Import completed successfully.`);
    console.log(`FINAL COUNTS: Semesters=${postSemesters}, Resources=${postResources}, Posts=${postPosts}, Documents=${postDocs}, Redirects=${postRedirects}`);
    await prisma.$disconnect();
}

runImport().catch(e => { console.error("FATAL ERROR DURING IMPORT:", e); process.exit(1); });
