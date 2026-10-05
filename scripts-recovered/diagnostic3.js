const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

for (const key in manifest) {
    if (manifest[key].status === 'ERROR') {
        console.log(manifest[key]);
        break;
    }
}
