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
const errors = new Set();

for (const key in manifest) {
    total++;
    const item = manifest[key];
    
    if (item.status === 'UPLOADED') {
        uploaded++;
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
        errors.add(item.error || 'empty_string_error');
    }
}

console.log(`TOTAL: ${total}`);
console.log(`UPLOADED: ${uploaded}`);
console.log(`PENDING: ${pending}`);
console.log(`ERROR: ${errorCount}`);
console.log(`CONFLICT: ${conflict}`);
console.log(`Is TOTAL exactly 6599? ${total === 6599 ? 'YES' : 'NO'}`);
console.log(`Number of successful uploads during this final run: ${newUploads}`);
console.log(`Unique B2 API errors encountered:`, Array.from(errors));

