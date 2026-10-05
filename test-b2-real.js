const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
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
        await s3Client.send(new GetObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: 'editorial/media/00c308b4c297b5381335aa9c69a693b6bdf6851505d78df2ef5aa3282b62d265/fevicon-logo-300x300.png',
            Range: 'bytes=0-0'
        }));
        console.log("Success! GetObject worked.");
    } catch (err) {
        console.error("HTTP Status Code:", err.$metadata?.httpStatusCode);
        console.error("Full Error:", err);
    }
}
run();
