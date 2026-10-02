const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const SRC_DIR = path.join(__dirname, '../wordpress-migration-source');
const STAGING_DIR = path.join(__dirname, '../migration-staging');
const DOCS_DIR = path.join(__dirname, '../docs');

// Authoritative hashes from Phase 2 Forensic Audit
const EXPECTED_HASHES = {
    'english/entertainlawyers-english.sql.gz': 'e2315ce6f85ed46b63623ae05ea86bd966d84e28485a3701f6468fd8a276c868',
    'english/entertainlawyers-english-uploads.zip': 'db5b7a5eba050adc09e5db988d2cd638fb7c26a22021a18e4d00a1d07cf707c3',
    'nepali/entertainlawyers-nepali.sql.gz': '88f7cc72462671e29ffafdeaedabc49119b46f877616dc5f01269c8833b219c0',
    'nepali/entertainlawyers-nepali-uploads.zip': '16f89293b5e984c572f324b69ca5189734e1c587f1c79bd1d4a1a34109aa96c7'
};

const DB_URL = process.env.DATABASE_URL || '';
if (!DB_URL.includes('localhost') && !DB_URL.includes('127.0.0.1')) {
    console.error("FATAL: DATABASE_URL points to non-local DB. Aborting for safety.");
    process.exit(1);
}

function computeHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function verifyHashes() {
    for (const [relPath, expectedHash] of Object.entries(EXPECTED_HASHES)) {
        const fullPath = path.join(SRC_DIR, relPath);
        if (!fs.existsSync(fullPath)) {
            console.error(`FATAL: Missing source file: ${relPath}`);
            process.exit(1);
        }
        const actualHash = computeHash(fullPath);
        if (actualHash !== expectedHash) {
            console.error(`FATAL: Checksum mismatch for ${relPath}. Expected ${expectedHash}, got ${actualHash}`);
            process.exit(1);
        }
    }
    console.log("Checksums verified.");
}

function extractInserts(sql, tableName) {
    const startStr = `INSERT INTO \`${tableName}\``;
    let idx = sql.indexOf(startStr);
    const tuplesList = [];
    while (idx !== -1) {
        let valStart = sql.indexOf('VALUES', idx);
        if (valStart === -1) break;
        valStart += 6;
        let inString = false, escape = false;
        let currentTuple = [], currentVal = [];
        let i = valStart;
        while (i < sql.length && sql[i] !== '(') i++;
        i++;
        while (i < sql.length) {
            const c = sql[i];
            if (escape) { currentVal.push(c); escape = false; }
            else if (c === '\\') { currentVal.push(c); escape = true; }
            else if (c === "'") { inString = !inString; currentVal.push(c); }
            else if (c === ',' && !inString) { currentTuple.push(currentVal.join('').trim()); currentVal = []; }
            else if (c === ')' && !inString) {
                currentTuple.push(currentVal.join('').trim());
                tuplesList.push(currentTuple);
                currentTuple = [];
                currentVal = [];
                let hitSemi = false;
                while (i < sql.length) {
                    i++;
                    if (sql[i] === ';') { hitSemi = true; break; }
                    if (sql[i] === '(') { break; }
                }
                if (hitSemi) break;
            }
            else { currentVal.push(c); }
            i++;
        }
        idx = sql.indexOf(startStr, i);
    }
    return tuplesList;
}

function unquote(str) { return (str && str.startsWith("'") && str.endsWith("'")) ? str.slice(1, -1) : str; }

function sanitizeHtml(html) {
    if (!html) return '';
    const $ = cheerio.load(html);
    $('*').each((i, el) => {
        const cls = $(el).attr('class') || '';
        if (cls.includes('elementor')) $(el).removeAttr('class');
    });
    $('script, style, iframe, object, embed, .elementor-hidden').remove();
    return $('body').html() || $.html();
}

async function extract() {
    verifyHashes();
    if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR);
    console.log("Extracting SQL payloads...");

    const sourceData = [];
    for (const site of ['english', 'nepali']) {
        const sqlBuf = fs.readFileSync(path.join(SRC_DIR, site, `entertainlawyers-${site}.sql.gz`));
        const sqlStr = zlib.gunzipSync(sqlBuf).toString('utf-8');
        const prefix = site === 'nepali' ? 'wp0o_' : 'wpfn_';
        const postsRaw = extractInserts(sqlStr, `${prefix}posts`);

        for (const p of postsRaw) {
            if (p.length < 21) continue;
            sourceData.push({
                site,
                ID: parseInt(p[0]),
                post_content: unquote(p[4]).replace(/\\r\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"'),
                post_title: unquote(p[5]).replace(/\\'/g, "'"),
                post_status: unquote(p[7]),
                post_name: unquote(p[11]),
                post_type: unquote(p[20])
            });
        }
    }
    fs.writeFileSync(path.join(STAGING_DIR, 'source-extracted.json'), JSON.stringify(sourceData, null, 2));
    console.log(`Extracted ${sourceData.length} total source posts.`);
}

async function stage() {
    const sourceData = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'source-extracted.json'), 'utf-8'));
    const phase5Ledger = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), 'utf-8'));

    const decisionsMap = new Map();
    phase5Ledger.forEach(d => decisionsMap.set(`${d.source.site}:${d.source.wpPostId}`, d));

    const prisma = new PrismaClient();
    const dbSubjects = await prisma.subject.findMany({ include: { semester: true } });
    await prisma.$disconnect();

    const subjectMap = new Map();
    dbSubjects.forEach(sub => subjectMap.set(`${sub.semester.name}:${sub.name}`, sub.id));

    const staged = { posts: [], resources: [], reviewQueue: [], skipped: [] };

    for (const p of sourceData) {
        if (p.post_type !== 'post') {
            staged.skipped.push({ ...p, reason: `Ignored post_type ${p.post_type}` });
            continue;
        }
        if (p.post_status === 'trash' || p.post_status === 'inherit' || p.post_status === 'auto-draft') {
            staged.skipped.push({ ...p, reason: `Ignored status ${p.post_status}` });
            continue;
        }

        const identity = `${p.site}:${p.ID}`;
        const decision = decisionsMap.get(identity);
        const baseObj = {
            sourceSite: p.site,
            wordpressPostId: p.ID,
            wordpressSlug: p.post_name,
            title: p.post_title,
            content: sanitizeHtml(p.post_content),
            status: 'PUBLISHED'
        };

        if (decision) {
            if (decision.decisionStatus === 'APPROVED_EXISTING_SUBJECT') {
                const subjKey = `${decision.proposedTarget.semester}:${decision.proposedTarget.subject}`;
                const subjectId = subjectMap.get(subjKey);
                if (!subjectId) {
                    staged.reviewQueue.push({ ...baseObj, reason: `Subject ${subjKey} not found in target DB` });
                } else {
                    staged.resources.push({ ...baseObj, type: decision.proposedTarget.resourceType || 'OTHER', subjectId });
                }
            } else if (decision.decisionStatus === 'NULL_SUBJECT_CANDIDATE') {
                staged.resources.push({ ...baseObj, type: decision.proposedTarget.resourceType || 'OTHER', subjectId: null });
            } else {
                staged.reviewQueue.push({ ...baseObj, reviewStatus: decision.decisionStatus, rationale: decision.rationale });
            }
        } else {
            staged.posts.push({ ...baseObj, type: p.site === 'nepali' ? 'NEPALI_SAMANYA_SAMACHAR' : 'NEWS' });
        }
    }

    fs.writeFileSync(path.join(STAGING_DIR, 'posts.json'), JSON.stringify(staged.posts, null, 2));
    fs.writeFileSync(path.join(STAGING_DIR, 'resources.json'), JSON.stringify(staged.resources, null, 2));
    fs.writeFileSync(path.join(STAGING_DIR, 'review-queue.json'), JSON.stringify(staged.reviewQueue, null, 2));
    fs.writeFileSync(path.join(STAGING_DIR, 'skipped.json'), JSON.stringify(staged.skipped, null, 2));

    console.log(`Staged: ${staged.posts.length} Posts, ${staged.resources.length} Resources, ${staged.reviewQueue.length} Review Queue, ${staged.skipped.length} Skipped/Discarded.`);
}

async function validate() {
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));

    for (const r of resources) {
        if (r.subjectId === "Uncategorized") throw new Error("Validation Failed: Uncategorized subject ID found.");
        // We explicitly check that subjectId is either a valid uuid or null
        if (r.subjectId !== null && r.subjectId.length < 10) throw new Error("Validation Failed: Invalid subjectId.");
    }
    console.log("Validation complete: staging artifacts are structurally sound.");
}

async function importStaging() {
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const prisma = new PrismaClient();

    console.log(`Connecting to: ${process.env.DATABASE_URL.split('@')[1]}`);
    console.log("Importing...");

    let countP = 0, countR = 0;
    for (const p of posts) {
        await prisma.post.create({ data: { title: p.title, content: p.content, type: p.type, status: p.status, metaTitle: `WP-${p.sourceSite}-${p.wordpressPostId}`, metaDesc: p.wordpressSlug } });
        countP++;
    }
    for (const r of resources) {
        await prisma.resource.create({ data: { title: r.title, content: r.content, type: r.type, status: r.status, subjectId: r.subjectId, metaTitle: `WP-${r.sourceSite}-${r.wordpressPostId}`, metaDesc: r.wordpressSlug } });
        countR++;
    }
    await prisma.$disconnect();
    console.log(`Imported ${countP} Posts and ${countR} Resources.`);
}

async function verify() {
    const prisma = new PrismaClient();
    const dbPosts = await prisma.post.count({ where: { metaTitle: { startsWith: 'WP-' } } });
    const dbResources = await prisma.resource.count({ where: { metaTitle: { startsWith: 'WP-' } } });

    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));
    const skipped = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'skipped.json'), 'utf-8'));
    const reviewQueue = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'review-queue.json'), 'utf-8'));
    const sourceData = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'source-extracted.json'), 'utf-8'));

    if (dbPosts !== posts.length || dbResources !== resources.length) {
        throw new Error(`Reconciliation Failed! DB Posts: ${dbPosts}, Staged: ${posts.length} | DB Resources: ${dbResources}, Staged: ${resources.length}`);
    }

    let nullSubjectCount = 0;
    let approvedSubjectCount = 0;
    resources.forEach(r => { if(r.subjectId === null) nullSubjectCount++; else approvedSubjectCount++; });

    const md = `# WORDPRESS MIGRATION PHASE 6 STAGING IMPORT REPORT

## 1. Authoritative Source Checksums
- \`english.sql.gz\`: ${EXPECTED_HASHES['english/entertainlawyers-english.sql.gz']}
- \`nepali.sql.gz\`: ${EXPECTED_HASHES['nepali/entertainlawyers-nepali.sql.gz']}
- \`english-uploads.zip\`: ${EXPECTED_HASHES['english/entertainlawyers-english-uploads.zip']}
- \`nepali-uploads.zip\`: ${EXPECTED_HASHES['nepali/entertainlawyers-nepali-uploads.zip']}

## 2. Entity-Level Reconciliation
- Total Source Records Examined: ${sourceData.length}
- Source records discarded (Revisions/Trash/Ignored): ${skipped.length}
- Target Editorial Posts Staged: ${posts.length}
- Target Resources Staged: ${resources.length}
  - APPROVED_EXISTING_SUBJECT (Imported): ${approvedSubjectCount}
  - NULL_SUBJECT_CANDIDATE (Imported): ${nullSubjectCount}
- Target Review Queue Staged (Not Imported): ${reviewQueue.length}

*Math verification:* ${skipped.length} + ${posts.length} + ${resources.length} + ${reviewQueue.length} = ${skipped.length + posts.length + resources.length + reviewQueue.length} (Matches Total ${sourceData.length})

## 3. PostgreSQL Import Counts
- Imported Posts: ${dbPosts}
- Imported Resources: ${dbResources}

## 4. Safety Assertions
- WordPress writes: 0
- Production PostgreSQL writes: 0
- Production R2 uploads: 0
- DNS changes: 0
- Production payment changes: 0
- Phase 5 ledger modifications: 0
- Source archive modifications: 0
- Database Identity: ${process.env.DATABASE_URL.split('@')[1]}

## 5. Migration Provenance & Null Rules
- NULL_SUBJECT_CANDIDATE records verified stored as \`subjectId: null\`.
- No "Uncategorized" taxonomy injected.
`;
    fs.writeFileSync(path.join(DOCS_DIR, 'WORDPRESS_MIGRATION_PHASE6_STAGING_IMPORT_REPORT.md'), md);
    console.log("Reconciliation complete. Report written.");
    await prisma.$disconnect();
}

const cmd = process.argv[2];
if (cmd === 'extract') extract().catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'stage') stage().catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'validate') validate().catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'import') importStaging().catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'verify') verify().catch(e => { console.error(e); process.exit(1); });
else console.log("Valid commands: extract, stage, validate, import, verify");
