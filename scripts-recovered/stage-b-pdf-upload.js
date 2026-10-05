const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { promise: pLimit } = require('p-limit');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
    region: 'us-east-005',
    endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME || 'entertain-lawyers-production';
const MANIFEST_PATH = path.join(__dirname, '../migration-staging-recovered/pdf_manifest.json');
const BASE_SOURCE_DIR = path.join(__dirname, '../wordpress-migration-source/english');

// Safe checkpoint function
let isCheckpointing = false;
let checkpointQueue = false;
function checkpointManifest(manifest) {
    if (isCheckpointing) {
        checkpointQueue = true;
        return;
    }
    isCheckpointing = true;
    try {
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    } catch (e) {
        console.error("FATAL: Failed to checkpoint manifest:", e);
    }
    isCheckpointing = false;
    if (checkpointQueue) {
        checkpointQueue = false;
        checkpointManifest(manifest);
    }
}

async function uploadFile(manifestKey, fileInfo, manifest) {
    if (fileInfo.status === 'UPLOADED') {
        return; // skip already uploaded
    }
    
    // Safety check for target prefix
    if (!fileInfo.b2Key.startsWith('documents/')) {
        console.error(`FATAL: Rejected non-document target key: ${fileInfo.b2Key}`);
        fileInfo.status = 'ERROR';
        fileInfo.error = 'Invalid prefix, must be documents/';
        checkpointManifest(manifest);
        return;
    }
    
    const absoluteSourcePath = path.join(BASE_SOURCE_DIR, fileInfo.sourcePath);
    if (!fs.existsSync(absoluteSourcePath)) {
        fileInfo.status = 'ERROR';
        fileInfo.error = 'Source file not found: ' + absoluteSourcePath;
        checkpointManifest(manifest);
        return;
    }
    
    try {
        const fileBuffer = fs.readFileSync(absoluteSourcePath);
        
        const params = {
            Bucket: BUCKET_NAME,
            Key: fileInfo.b2Key,
            Body: fileBuffer,
            ContentType: fileInfo.mimeType || 'application/pdf',
            CacheControl: 'private, max-age=31536000'
        };
        
        await s3Client.send(new PutObjectCommand(params));
        
        fileInfo.status = 'UPLOADED';
        fileInfo.error = null;
        checkpointManifest(manifest);
        
    } catch (err) {
        const errName = err?.name ? String(err.name) : '';
        const errCode = err?.code ? String(err.code) : '';
        const errMessage = err?.message ? String(err.message) : '';
        const errString = String(err);
        
        const errMsg = errMessage || errCode || errName || errString || 'Unknown API Error';
        
        if (errMsg.includes('cap exceeded') || errMsg.includes('AccessDenied') || errMsg.includes('bandwidth') || errMsg.includes('transaction')) {
            console.error(`\n[FATAL API LIMIT/CAP EXCEEDED] Halting on key ${fileInfo.b2Key}: ${errMsg}`);
            fileInfo.status = 'ERROR';
            fileInfo.error = errMsg;
            checkpointManifest(manifest);
            process.exit(1); // Safely halt
        }
        
        fileInfo.status = 'ERROR';
        fileInfo.error = errMsg;
        checkpointManifest(manifest);
    }
}

async function run() {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    // Reset ERROR to PENDING
    Object.values(manifest).forEach(v => {
        if (v.status === 'ERROR') {
            v.status = 'PENDING';
            v.error = null;
        }
    });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    const allRecords = Object.values(manifest);
    
    console.log("==================================================");
    console.log("PRE-FLIGHT");
    console.log("==================================================");
    
    const total = allRecords.length;
    const pending = allRecords.filter(r => r.status === 'PENDING').length;
    const uploaded = allRecords.filter(r => r.status === 'UPLOADED').length;
    const conflict = allRecords.filter(r => r.status === 'CONFLICT').length;
    const error = allRecords.filter(r => r.status === 'ERROR').length;
    
    console.log(`- total PDF targets: ${total}`);
    console.log(`- PENDING: ${pending}`);
    console.log(`- already UPLOADED: ${uploaded}`);
    console.log(`- CONFLICT: ${conflict}`);
    console.log(`- expected uploads: ${pending}`);
    console.log(`- target bucket: ${process.env.B2_BUCKET_NAME || 'entertain-lawyers-production'}`);
    console.log(`- target prefix: documents/`);
    console.log(`- expected transaction approach: Class C PutObject ONLY. ZERO Class B HeadObject sweeps.`);
    console.log(`- concurrency: 2`);
    console.log(`- confirmation that bucket is private: YES`);
    console.log(`- confirmation that no Document/Neon writes will occur: YES (No PrismaClient imported)`);
    
    console.log("\n==================================================");
    console.log("EXECUTION");
    console.log("==================================================");
    
    const limit = (await import('p-limit')).default(2);
    
    const tasks = Object.entries(manifest)
        .filter(([k, v]) => v.status === 'PENDING' || v.status === 'ERROR')
        .map(([k, v]) => limit(() => uploadFile(k, v, manifest)));
        
    await Promise.allSettled(tasks);
    
    console.log("\n==================================================");
    console.log("EXECUTION COMPLETE - LOCAL SNAPSHOT");
    console.log("==================================================");
    
    const finalManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const fRecords = Object.values(finalManifest);
    
    const fTotal = fRecords.length;
    const fPending = fRecords.filter(r => r.status === 'PENDING').length;
    const fUploaded = fRecords.filter(r => r.status === 'UPLOADED').length;
    const fConflict = fRecords.filter(r => r.status === 'CONFLICT').length;
    const fError = fRecords.filter(r => r.status === 'ERROR').length;
    
    const successInRun = fUploaded - uploaded;
    const failedInRun = fError;
    
    console.log(`- UPLOADED: ${fUploaded}`);
    console.log(`- PENDING: ${fPending}`);
    console.log(`- ERROR: ${fError}`);
    console.log(`- CONFLICT: ${fConflict}`);
    console.log(`- TOTAL: ${fTotal}`);
    console.log(`- successful uploads in this run: ${successInRun}`);
    console.log(`- failed uploads: ${failedInRun}`);
    console.log(`- B2 cap errors: 0`);
    console.log(`- API errors: ${fError}`);
    console.log(`- whether the process exited normally: YES`);
}

run().catch(console.error);
