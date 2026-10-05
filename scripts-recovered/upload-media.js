const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SRC_DIR = path.join(__dirname, '../wordpress-migration-source');
const TMP_UPLOADS_DIR = '/tmp/wp-uploads';

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
const MAX_CONCURRENCY = 1;
const MAX_RETRIES = 5;

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Simple bounded concurrency pool
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
    console.log(`Starting B2 Live Storage Upload ${DRY_RUN ? '(DRY RUN)' : ''}...`);

    const media = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/media.json'), 'utf8'));
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const all = [...media, ...docs];

    const stats = {
        wouldUpload: 0,
        wouldSkip: 0,
        missing: 0,
        conflicts: 0,
        errors: 0,
        uploaded: 0,
        skippedExisting: 0,
        uniqueImageTargetsExpected: 6599,
        pdfsExcluded: 21,
    };

    // 1. Unzip the archives to TMP_UPLOADS_DIR safely if live run or verifying
    if (!fs.existsSync(TMP_UPLOADS_DIR)) {
        console.log("Extracting media archives to tmp...");
        require('child_process').execSync(`mkdir -p ${TMP_UPLOADS_DIR}/english`);
        require('child_process').execSync(`mkdir -p ${TMP_UPLOADS_DIR}/nepali`);
        require('child_process').execSync(`unzip -q -o "${path.join(SRC_DIR, 'english', 'entertainlawyers-english-uploads.zip')}" -d ${TMP_UPLOADS_DIR}/english`);
        require('child_process').execSync(`unzip -q -o "${path.join(SRC_DIR, 'nepali', 'entertainlawyers-nepali-uploads.zip')}" -d ${TMP_UPLOADS_DIR}/nepali`);
    }

    // 2. Identify Unique Targets for Images
    const uniqueTargets = new Map();

    for (const m of all) {
        if (m.isMissing) {
            stats.missing++;
            continue;
        }

        // ONLY process images, explicitly skip PDFs
        if (m.extension === '.pdf') {
            continue;
        }

        const b2Key = `editorial/media/${m.sha256}/${m.originalFilename}`;
        
        if (!uniqueTargets.has(b2Key)) {
            uniqueTargets.set(b2Key, m);
        }
    }

    const targetList = Array.from(uniqueTargets.entries());
    console.log(`Unique Image Targets: ${targetList.length}`);

    if (targetList.length !== stats.uniqueImageTargetsExpected) {
        console.error(`STOP. Expected ${stats.uniqueImageTargetsExpected} targets, got ${targetList.length}.`);
        process.exit(1);
    }

    // 3. Process Uploads with Bounded Concurrency
    const tasks = targetList.map(([b2Key, m]) => async () => {
        let attempt = 0;
        const localPath = path.join(TMP_UPLOADS_DIR, m.sourceSite, m.originalRelativePath);
        
        while (attempt < MAX_RETRIES) {
            try {
                // HEAD object first
                let exists = false;
                let existingSize = -1;
                
                    try {
                        const headResult = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: b2Key }));
                        exists = true;
                        existingSize = headResult.ContentLength;
                    } catch (err) {
                        if (err.name !== 'NotFound') {
                            err.message = '[HEAD] ' + err.message;
                            throw err; // Real error, not 404
                        }
                    }

                if (exists) {
                    if (existingSize !== m.byteSize) {
                        console.error(`\nCONFLICT: ${b2Key} exists but size differs (B2: ${existingSize}, Local: ${m.byteSize}). STOPPING.`);
                        stats.conflicts++;
                        if (!DRY_RUN) process.exit(1);
                    } else {
                        stats.wouldSkip++;
                        if (!DRY_RUN) stats.skippedExisting++;
                    }
                    return; // Done
                }

                stats.wouldUpload++;

                if (!DRY_RUN) {
                    try {
                        const fileBuffer = fs.readFileSync(localPath);
                        await s3Client.send(new PutObjectCommand({
                            Bucket: bucket,
                            Key: b2Key,
                            Body: fileBuffer,
                            ContentType: m.mimeType,
                            ContentLength: fileBuffer.length
                        }));
                    } catch (err) {
                        err.message = '[PUT] ' + err.message;
                        throw err;
                    }

                    try {
                        const verifyHead = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: b2Key }));
                        if (verifyHead.ContentLength !== m.byteSize) {
                            throw new Error("Upload verification failed: Size mismatch after put.");
                        }
                    } catch (err) {
                        err.message = '[VERIFY_HEAD] ' + err.message;
                        throw err;
                    }
                    stats.uploaded++;
                }
                
                // Print progress every 500
                const progress = stats.uploaded + stats.skippedExisting + stats.wouldSkip + stats.wouldUpload;
                if (progress % 500 === 0) {
                    console.log(`Progress: ${progress} / ${targetList.length}`);
                }

                return; // Success, exit retry loop
            } catch (err) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    console.error(`\nERROR uploading ${b2Key}: ${err.stack}`);
                    stats.errors++;
                    if (!DRY_RUN) process.exit(1);
                }
                console.error(`Retry ${attempt} for ${b2Key}... Error: ${err.message}`);
                await sleep(2000 * attempt * attempt);
            }
        }
    });

    await promisePool(tasks, MAX_CONCURRENCY);

    console.log("\n--- RESULT ---");
    console.log(JSON.stringify(stats, null, 2));

    // Cleanup tmp if not dry run
    if (!DRY_RUN && stats.errors === 0 && stats.conflicts === 0) {
        console.log("Cleaning up tmp directory...");
        require('child_process').execSync(`rm -rf ${TMP_UPLOADS_DIR}`);
    }
}

run().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
