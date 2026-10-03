const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../migration-staging-recovered/upload_manifest.json');
const outputPath = path.join(__dirname, '../src/lib/media/legacy-image-map.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const map = {};

for (const [b2Key, data] of Object.entries(manifest)) {
  if (data.sourcePath && data.status === 'UPLOADED') {
    map[data.sourcePath] = b2Key;
  }
}

// Make sure the directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(map, null, 0));
console.log(`Generated ${outputPath} with ${Object.keys(map).length} mappings.`);
