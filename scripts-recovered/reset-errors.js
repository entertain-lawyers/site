const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const backupPath = path.join(__dirname, `../migration-staging-recovered/upload_manifest.backup_${Date.now()}.json`);

// Read original
const content = fs.readFileSync(manifestPath);
const hash = crypto.createHash('sha256').update(content).digest('hex');

// Write backup
fs.writeFileSync(backupPath, content);
console.log(`Backup created: ${backupPath}`);
console.log(`Backup SHA-256: ${hash}`);

// Parse
const manifest = JSON.parse(content.toString('utf8'));

let beforeCounts = { UPLOADED: 0, PENDING: 0, ERROR: 0, CONFLICT: 0, TOTAL: 0 };
let afterCounts = { UPLOADED: 0, PENDING: 0, ERROR: 0, CONFLICT: 0, TOTAL: 0 };

for (const key in manifest) {
    beforeCounts[manifest[key].status]++;
    beforeCounts.TOTAL++;
}

// Reset
for (const key in manifest) {
    if (manifest[key].status === 'ERROR') {
        manifest[key].status = 'PENDING';
        manifest[key].error = null;
    }
}

// Count after
for (const key in manifest) {
    afterCounts[manifest[key].status]++;
    afterCounts.TOTAL++;
}

// Write back
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log("Before counts:", beforeCounts);
console.log("After counts:", afterCounts);

