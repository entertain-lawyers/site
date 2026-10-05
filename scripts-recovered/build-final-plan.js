const fs = require('fs');
const path = require('path');
const { generateResourceId } = require('./migration-identity');

const prep = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-final-prep.json'), 'utf8'));

let finalJson = [];
let mdContent = `# Phase 7B - Final Corrective Mapping Plan\n\n`;
mdContent += `This read-only plan defines the exact transactional logic required to reconcile 20 missing PDF targets safely.\n\n`;

mdContent += `## PART A - 11 SHOULD_BE_RESOURCE RECORDS (SAFE_TO_CONVERT)\n\n`;
const partA = prep.filter(p => p.provisionalDisposition === 'B. SHOULD_BE_RESOURCE');
partA.forEach(r => {
    finalJson.push({
        pdf: r.pdfFilename,
        action: 'SAFE_TO_CONVERT',
        wpPostId: r.wpPostId,
        wpTitle: r.wpTitle,
        sourceId: r.neonRecord.id,
        targetId: r.targetResourceId,
        type: 'OLD_QUESTION',
        subjectId: null
    });
    
    mdContent += `### ${r.pdfFilename}\n`;
    mdContent += `- **Neon Post ID**: \`${r.neonRecord.id}\`\n`;
    mdContent += `- **WordPress ID**: ${r.wpPostId}\n`;
    mdContent += `- **Target Resource ID**: \`${r.targetResourceId}\`\n`;
    mdContent += `- **Title**: ${r.dbPostDetails.title}\n`;
    mdContent += `- **Slug**: ${r.dbPostDetails.slug}\n`;
    mdContent += `- **Content Length**: ${r.dbPostDetails.contentLength} bytes\n`;
    mdContent += `- **Timestamps**: Created: ${r.dbPostDetails.createdAt}, Updated: ${r.dbPostDetails.updatedAt}\n`;
    mdContent += `- **Author**: ${r.dbPostDetails.authorEmail || 'None'}\n`;
    mdContent += `- **SEO**: Title: ${r.dbPostDetails.seoTitle || 'null'}, Desc: ${r.dbPostDetails.seoDescription || 'null'}\n`;
    mdContent += `- **Redirects**: ${r.redirects.map(rd => rd.source).join(', ') || 'None'}\n`;
    mdContent += `- **ResourceType**: \`OLD_QUESTION\`\n`;
    mdContent += `- **Semester**: null (Phase 5 rule default)\n`;
    mdContent += `- **Subject**: null (Phase 5 rule default)\n`;
    mdContent += `- **Fields Preserved**: \`title\` -> \`title\`, \`seoTitle\` -> \`metaTitle\`, \`seoDescription\` -> \`metaDesc\`.\n`;
    mdContent += `- **Fields LOST**: \`slug\`, \`content\`, \`createdAt\`, \`updatedAt\`, \`authorId\` cannot be represented by the current \`Resource\` schema.\n\n`;
});

mdContent += `## PART B - 9 ORPHANED DFLIP PDFs (SAFE_TO_CREATE / NEEDS_BUSINESS_DECISION)\n\n`;
const partB = prep.filter(p => p.provisionalDisposition === 'D. NEEDS_BUSINESS_DECISION');
partB.forEach(r => {
    const action = r.proposedResourceType === 'OLD_QUESTION' ? 'SAFE_TO_CREATE_RESOURCE' : 'NEEDS_BUSINESS_DECISION';
    finalJson.push({
        pdf: r.pdfFilename,
        action: action,
        wpPostId: r.wpPostId,
        wpTitle: r.wpTitle,
        targetId: r.targetResourceId,
        type: r.proposedResourceType,
        subjectId: null
    });
    
    mdContent += `### ${r.pdfFilename}\n`;
    mdContent += `- **SHA-256**: \`${r.sha256}\`\n`;
    mdContent += `- **Size**: ${r.byteSize} bytes\n`;
    mdContent += `- **Original dflip ID**: ${r.wpPostId}\n`;
    mdContent += `- **Title**: ${r.wpTitle || 'None'}\n`;
    mdContent += `- **Semester / Subject Metadata**: Title implies Semester (${r.wpTitle ? r.wpTitle.match(/\d+(st|nd|rd|th)\s+Semester/i)?.[0] || 'Unknown' : 'Unknown'}), no explicit subject.\n`;
    mdContent += `- **Classification**: \`${r.proposedResourceType}\`\n`;
    mdContent += `- **Proposed Semester/Subject ID**: null (pending manual taxonomy mapping)\n`;
    mdContent += `- **Ambiguity**: ${action === 'NEEDS_BUSINESS_DECISION' ? 'Title implies non-question material (Moot Court/Clinical). Should this be CASE_LAW or OTHER?' : 'None. Title explicitly marks it as old questions.'}\n\n`;
});

const partC = prep.filter(p => p.provisionalDisposition === 'C. ALREADY_REPRESENTED_BY_RESOURCE');
if (partC.length > 0) {
    const r = partC[0];
    finalJson.push({
        pdf: r.pdfFilename,
        action: 'ALREADY_REPRESENTED',
        targetId: r.neonRecord.id
    });
    mdContent += `## PART C - 1 ALREADY_REPRESENTED RECORD\n\n`;
    mdContent += `### ${r.pdfFilename}\n`;
    mdContent += `- **Neon Resource ID**: \`${r.neonRecord.id}\`\n`;
    mdContent += `- **Title**: ${r.neonRecord.title}\n\n`;
}

mdContent += `## POST -> RESOURCE TRANSACTION DESIGN\n\n`;
mdContent += `For the 11 SHOULD_BE_RESOURCE records, the exact atomic sequence is:\n`;
mdContent += `1. \`prisma.resource.upsert({ where: { id: deterministicId }, create: {...}, update: {...} })\`\n`;
mdContent += `2. \`prisma.redirect.updateMany({ where: { destination: '/news/' + oldPostId }, data: { destination: '/resources/' + deterministicId } })\`\n`;
mdContent += `3. \`prisma.post.delete({ where: { id: oldPostId } })\`\n\n`;
mdContent += `**Safety guarantees**:\n`;
mdContent += `- The transaction is atomic (` + '`' + `prisma.$transaction([...])` + '`' + `).\n`;
mdContent += `- Redirect SEO value is preserved.\n`;
mdContent += `- If rerun, the upsert is idempotent and the redirect update will simply affect 0 rows. (The delete would throw an error if already deleted, so the script should check \`if (existingPost) { delete }\`).\n\n`;

mdContent += `## DOCUMENT & B2 PLAN\n\n`;
mdContent += `**B2 Target**: 21 Class C \`PutObject\` calls to \`documents/<sha256>/<filename>\`.\n`;
mdContent += `**Privacy**: The B2 bucket is inherently private. Public access is forbidden by \`src/app/api/media/[...key]/route.ts\`. Files will remain private.\n`;
mdContent += `**Authorization**: Access requires invoking \`getSecureDocumentUrl\` which validates JWT auth and active premium entitlement before returning a 300-second presigned URL.\n`;
mdContent += `**Neon Document Writes**: 21 \`prisma.document.upsert()\` creating records containing the \`storageKey\`, \`fileSize\`, and \`mimeType\`.\n`;
mdContent += `**Resource Update**: 21 \`prisma.resource.update({ where: { id }, data: { documentId: doc.id } })\`.\n\n`;

mdContent += `## EXACT REQUIRED WRITES (DRY RUN ONLY)\n`;
mdContent += `- **Neon**: 21 \`Document.upsert\`, 11 \`Post.delete\`, 20 \`Resource.upsert\`, ~11 \`Redirect.updateMany\`.\n`;
mdContent += `- **B2**: 21 uploads (Class C).\n\n`;

mdContent += `**FINAL STATUS: BLOCKED — BUSINESS DECISION REQUIRED**\n`;
mdContent += `(Pending decision on the 9 orphaned dflip PDFs taxonomy and authorization to execute the lossy Post->Resource conversion for the 11 records).\n`;

fs.writeFileSync(path.join(__dirname, '../docs/PHASE7B_FINAL_CORRECTION_PLAN.md'), mdContent);
fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-final-correction-plan.json'), JSON.stringify(finalJson, null, 2));

console.log("Done");
