const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let total = 0;
let uploaded = 0;
let pending = 0;
let conflict = 0;
let failed = 0;
let newUploads = 0;

let pendingBytes = [];

// Since we checkpoint every 50 uploads, we can look at uploadTimestamp
const uploadTimes = [];

for (const key in manifest) {
    total++;
    const item = manifest[key];
    if (item.status === 'UPLOADED') {
        uploaded++;
        if (item.uploadTimestamp) {
            // Check if it was uploaded in the current run
            // Our script sets uploadTimestamp to Date.toISOString() when it uploads
            // The ones from previous run were set during create-upload-manifest.js which was at ~12:57 UTC
            // But wait, create-upload-manifest.js also set uploadTimestamp to new Date().toISOString()
            // We can just sort all timestamps.
            uploadTimes.push({ time: new Date(item.uploadTimestamp).getTime(), size: item.byteSize });
        }
    } else if (item.status === 'PENDING') {
        pending++;
        pendingBytes.push(item.byteSize);
    } else if (item.status === 'CONFLICT') {
        conflict++;
    } else if (item.status === 'ERROR') {
        failed++;
    }
}

// Uploads in the current run (after 13:10 UTC)
const currentRunUploads = uploadTimes.filter(u => u.time > new Date('2026-10-02T13:10:00Z').getTime());
newUploads = currentRunUploads.length;

// Sort current run uploads by time
currentRunUploads.sort((a, b) => a.time - b.time);

// Calculate rate over the last 5 minutes (300,000 ms)
const now = Date.now();
// Wait, Date.now() is current time. The script might be checkpointing right now.
// Let's find the time of the LAST checkpoint.
const lastTime = currentRunUploads.length > 0 ? currentRunUploads[currentRunUploads.length - 1].time : now;
const fiveMinsAgo = lastTime - 5 * 60 * 1000;

const uploadsLast5Mins = currentRunUploads.filter(u => u.time >= fiveMinsAgo);
const uploadsPerMin = uploadsLast5Mins.length / 5;
const bytesLast5Mins = uploadsLast5Mins.reduce((sum, u) => sum + u.size, 0);
const bytesPerMin = bytesLast5Mins / 5;

// Pending sizes
pendingBytes.sort((a, b) => a - b);
const avgPendingSize = pendingBytes.length > 0 ? pendingBytes.reduce((a,b)=>a+b,0) / pendingBytes.length : 0;
const medianPendingSize = pendingBytes.length > 0 ? pendingBytes[Math.floor(pendingBytes.length / 2)] : 0;

console.log(`Total targets: ${total}`);
console.log(`UPLOADED: ${uploaded} (Newly uploaded this run: ${newUploads})`);
console.log(`PENDING: ${pending}`);
console.log(`CONFLICT: ${conflict}`);
console.log(`Failed (ERROR): ${failed}`);
console.log(`Uploads in last 5 mins: ${uploadsLast5Mins.length}`);
console.log(`Approx Uploads/Min: ${uploadsPerMin.toFixed(2)}`);
console.log(`Approx Bytes/Min: ${(bytesPerMin / 1024 / 1024).toFixed(2)} MB/min`);
console.log(`Avg Pending Size: ${(avgPendingSize / 1024).toFixed(2)} KB`);
console.log(`Median Pending Size: ${(medianPendingSize / 1024).toFixed(2)} KB`);

if (uploadsPerMin > 0) {
    const estRemainingMins = pending / uploadsPerMin;
    console.log(`Estimated Remaining Time: ${Math.round(estRemainingMins)} minutes`);
} else {
    console.log(`Estimated Remaining Time: N/A (Rate is 0)`);
}

