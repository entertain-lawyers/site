const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let total = 0;
let uploaded = 0;
let pending = 0;
let conflict = 0;
let errorCount = 0;
let newUploads = 0;
let capExceeded = false;

for (const key in manifest) {
    total++;
    const item = manifest[key];
    
    if (item.status === 'UPLOADED') {
        uploaded++;
        // Count uploads that occurred after the live run started (13:10 UTC)
        if (item.uploadTimestamp) {
            if (new Date(item.uploadTimestamp).getTime() > new Date('2026-10-02T13:10:00Z').getTime()) {
                newUploads++;
            }
        }
    } else if (item.status === 'PENDING') {
        pending++;
    } else if (item.status === 'CONFLICT') {
        conflict++;
    } else if (item.status === 'ERROR') {
        errorCount++;
        if (item.error && item.error.includes('CAP_EXCEEDED')) {
            capExceeded = true;
        }
    }
}

console.log(`TOTAL: ${total}`);
console.log(`UPLOADED: ${uploaded}`);
console.log(`PENDING: ${pending}`);
console.log(`ERROR: ${errorCount}`);
console.log(`CONFLICT: ${conflict}`);
console.log(`Is TOTAL exactly 6599? ${total === 6599 ? 'YES' : 'NO'}`);
console.log(`Number of successful LIVE uploads: ${newUploads}`);
console.log(`Number of LIVE failures: ${errorCount}`);
console.log(`Did any capExceeded occur? ${capExceeded ? 'YES' : 'NO'}`);

