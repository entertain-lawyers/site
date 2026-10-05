const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
});

async function run() {
    try {
        const result = await s3Client.send(new ListObjectsV2Command({
            Bucket: process.env.B2_BUCKET_NAME,
            Prefix: 'editorial/media/',
            MaxKeys: 10
        }));
        console.log("Success! Objects found:", result.KeyCount);
        if (result.Contents) {
            result.Contents.forEach(obj => console.log(obj.Key, obj.Size));
        }
    } catch (err) {
        console.error("HTTP Status Code:", err.$metadata?.httpStatusCode);
        console.error("Full Error:", err);
    }
}
run();
