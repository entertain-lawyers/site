const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
});

async function run() {
    console.log("Fetching B2 remote state via ListObjectsV2...");
    const existingInB2 = new Map();
    let isTruncated = true;
    let continuationToken = undefined;
    let b2ApiCalls = 0;

    while (isTruncated) {
        const result = await s3Client.send(new ListObjectsV2Command({
            Bucket: process.env.B2_BUCKET_NAME,
            Prefix: 'editorial/media/',
            MaxKeys: 1000,
            ContinuationToken: continuationToken
        }));
        b2ApiCalls++;
        
        if (result.Contents) {
            for (const obj of result.Contents) {
                existingInB2.set(obj.Key, obj.Size);
            }
        }
        
        isTruncated = result.IsTruncated;
        continuationToken = result.NextContinuationToken;
    }
    console.log(`B2 state synced. API calls: ${b2ApiCalls} (Class C). Objects found: ${existingInB2.size}`);

    console.log("Building local manifest...");
    const media = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/media.json'), 'utf8'));
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
    const all = [...media, ...docs];
    
    const manifest = {};
    let targetCount = 0;

    for (const m of all) {
        if (m.isMissing || m.extension === '.pdf') {
            continue;
        }

        const b2Key = `editorial/media/${m.sha256}/${m.originalFilename}`;
        
        if (!manifest[b2Key]) {
            let status = "PENDING";
            let verifyStatus = "UNVERIFIED";
            
            // Check if it's already in B2
            if (existingInB2.has(b2Key)) {
                if (existingInB2.get(b2Key) === m.byteSize) {
                    status = "UPLOADED";
                    verifyStatus = "SIZE_MATCH";
                } else {
                    status = "CONFLICT";
                    verifyStatus = "SIZE_MISMATCH";
                }
            }
            
            manifest[b2Key] = {
                sourcePath: m.originalRelativePath,
                sourceLocale: m.sourceSite,
                sourceFilename: m.originalFilename,
                sha256: m.sha256,
                byteSize: m.byteSize,
                mimeType: m.mimeType,
                b2Key: b2Key,
                status: status,
                verificationStatus: verifyStatus,
                uploadTimestamp: status === 'UPLOADED' ? new Date().toISOString() : null
            };
            targetCount++;
        }
    }

    console.log(`Unique image targets: ${targetCount}`);
    
    const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest created at ${manifestPath}`);
    
    // Summary
    const stats = { PENDING: 0, UPLOADED: 0, CONFLICT: 0 };
    for (const key in manifest) {
        stats[manifest[key].status]++;
    }
    console.log(stats);
}

run().catch(console.error);
