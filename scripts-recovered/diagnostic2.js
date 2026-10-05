const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const errors = {};
for (const key in manifest) {
    const item = manifest[key];
    if (item.status === 'ERROR') {
        errors[item.error] = (errors[item.error] || 0) + 1;
    }
}
console.log("Errors:", errors);
