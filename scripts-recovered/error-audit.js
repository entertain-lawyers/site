const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const errors = {};
const sampleByError = {};
let totalErrors = 0;

for (const key in manifest) {
    const item = manifest[key];
    if (item.status === 'ERROR') {
        totalErrors++;
        
        // Verify required fields
        if (!item.sourcePath || !item.b2Key || !item.sha256 || !item.byteSize || item.error === undefined) {
            console.error("INVALID ERROR RECORD FOUND:", item);
        }

        const eMsg = item.error === '' ? '<empty string>' : String(item.error);
        if (!errors[eMsg]) {
            errors[eMsg] = 0;
            sampleByError[eMsg] = item;
        }
        errors[eMsg]++;
    }
}

console.log("Total ERROR records:", totalErrors);
console.log("Error Categories:");
for (const eMsg in errors) {
    console.log(`\n- ${eMsg} (Count: ${errors[eMsg]})`);
    console.log("  Example:");
    console.log(`    sourcePath: ${sampleByError[eMsg].sourcePath}`);
    console.log(`    b2Key: ${sampleByError[eMsg].b2Key}`);
    console.log(`    sha256: ${sampleByError[eMsg].sha256}`);
    console.log(`    byteSize: ${sampleByError[eMsg].byteSize}`);
}

