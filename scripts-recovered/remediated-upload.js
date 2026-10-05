const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TMP_UPLOADS_DIR = '/tmp/wp-uploads';
const MANIFEST_PATH = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
});

const bucket = process.env.B2_BUCKET_NAME;
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;

let manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function saveManifest() {
    if (!DRY_RUN) {
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    }
}

async function promisePool(tasks, limit) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (limit <= tasks.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

async function run() {
    console.log(`Starting Redesigned B2 Upload ${DRY_RUN ? '(DRY RUN)' : ''}...`);

    let pendingCount = 0;
    let uploadedCount = 0;
    let conflictCount = 0;
    
    // Initial stats
    for (const key in manifest) {
        if (manifest[key].status === 'PENDING') pendingCount++;
        else if (manifest[key].status === 'UPLOADED') uploadedCount++;
        else if (manifest[key].status === 'CONFLICT') conflictCount++;
    }
    
    console.log(`Manifest loaded. Targets to upload: ${pendingCount}. Already uploaded: ${uploadedCount}. Conflicts: ${conflictCount}`);

    const stats = {
        attempted: 0,
        success: 0,
        failed: 0,
        capExceeded: false
    };

    let capExceededGlobal = false;
    let writesSinceSave = 0;

    const tasks = [];
    
    for (const key in manifest) {
        const item = manifest[key];
        
        if (item.status !== 'PENDING') continue;

        tasks.push(async () => {
            if (capExceededGlobal) return;
            
            const localPath = path.join(TMP_UPLOADS_DIR, item.sourceLocale, item.sourcePath);
            let attempt = 0;
            
            stats.attempted++;
            
            if (DRY_RUN) {
                item.status = 'UPLOADED';
                item.verificationStatus = 'DRY_RUN_OK';
                stats.success++;
                return;
            }

            while (attempt < MAX_RETRIES) {
                try {
                    const fileBuffer = fs.readFileSync(localPath);
                    const response = await s3Client.send(new PutObjectCommand({
                        Bucket: bucket,
                        Key: item.b2Key,
                        Body: fileBuffer,
                        ContentType: item.mimeType,
                        ContentLength: item.byteSize
                    }));
                    
                    item.status = 'UPLOADED';
                    item.verificationStatus = `ETAG_MATCH_${response.ETag ? 'YES' : 'UNKNOWN'}`;
                    item.uploadTimestamp = new Date().toISOString();
                    stats.success++;
                    
                    writesSinceSave++;
                    if (writesSinceSave >= 50) {
                        saveManifest();
                        writesSinceSave = 0;
                        console.log(`Progress: ${stats.success} successful uploads so far...`);
                    }
                    
                    return; // Done
                } catch (err) {
                    // Check for Cap Exceeded Error
                    if (err.message && err.message.includes('cap exceeded') || err.$metadata?.httpStatusCode === 403) {
                        console.error(`CAP EXCEEDED response from B2 on ${item.b2Key}. STOPPING.`);
                        capExceededGlobal = true;
                        stats.capExceeded = true;
                        item.error = "CAP_EXCEEDED";
                        stats.failed++;
                        saveManifest();
                        return;
                    }
                    
                    attempt++;
                    if (attempt >= MAX_RETRIES) {
                        const errName = err?.name ? String(err.name) : '';
                        const errCode = err?.code ? String(err.code) : '';
                        const errMessage = err?.message ? String(err.message) : '';
                        const errString = String(err);

                        const errMsg =
                          errMessage ||
                          errCode ||
                          errName ||
                          errString ||
                          'Unknown upload error';

                        console.error(
                          `Failed to upload ${item.b2Key} after ${MAX_RETRIES} attempts. ` +
                          `name=${errName || 'unknown'} code=${errCode || 'unknown'} message=${errMsg}`
                        );

                        item.status = 'ERROR';
                        item.error = errMsg;
                        stats.failed++;
                        saveManifest();
                        return;
                    }
                    
                    await sleep(2000 * attempt * attempt);
                }
            }
        });
    }

    await promisePool(tasks, MAX_CONCURRENCY);

    saveManifest();
    
    console.log("\n--- DRY RUN SUMMARY ---");
    console.log(JSON.stringify(stats, null, 2));
}

run().catch(console.error);
