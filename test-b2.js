const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: 'editorial/media/test.txt',
            Body: Buffer.from('test'),
            ContentType: 'text/plain',
            ContentLength: 4
        }));
        console.log("Success!");
    } catch (err) {
        console.error("HTTP Status Code:", err.$metadata?.httpStatusCode);
        console.error("Full Error:", err);
    }
}
run();
