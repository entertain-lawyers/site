const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let total = 0;
let uploaded = 0;
let pending = 0;
let conflict = 0;
let errorCount = 0;
const errors = new Set();
let capExceeded = false;

for (const key in manifest) {
    total++;
    const item = manifest[key];
    
    if (item.status === 'UPLOADED') {
        uploaded++;
    } else if (item.status === 'PENDING') {
        pending++;
    } else if (item.status === 'CONFLICT') {
        conflict++;
    } else if (item.status === 'ERROR') {
        errorCount++;
        errors.add(item.error || '<empty>');
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
console.log(`Failed Retry Count: ${errorCount}`);
console.log(`Successful Retry Count: ${uploaded - 6313}`);
console.log(`Any Cap Exceeded? ${capExceeded ? 'YES' : 'NO'}`);
console.log(`Any Conflicts? ${conflict > 0 ? 'YES' : 'NO'}`);
console.log(`Error categories:`, Array.from(errors));

