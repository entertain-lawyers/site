const fs = require('fs');
const media = JSON.parse(fs.readFileSync('migration-staging-recovered/media.json', 'utf8'));
const docs = JSON.parse(fs.readFileSync('migration-staging-recovered/documents.json', 'utf8'));
const all = [...media, ...docs];

let total = all.length;
let originalImages = all.filter(m => !m.isDerivative && !m.isMissing && m.extension !== '.pdf').length;
let derivatives = all.filter(m => m.isDerivative).length;
let pdfs = all.filter(m => m.extension === '.pdf').length;
let missing = all.filter(m => m.isMissing).length;

const filenameMap = new Map();
let filenameCollisions = 0;
let exactDuplicates = 0;

for (const m of all) {
    if (m.isMissing) continue;
    
    // Check filename collision
    if (filenameMap.has(m.originalFilename)) {
        const existing = filenameMap.get(m.originalFilename);
        if (existing.sha256 === m.sha256) {
            exactDuplicates++;
        } else {
            filenameCollisions++;
        }
    } else {
        filenameMap.set(m.originalFilename, m);
    }
}

console.log({
    total, originalImages, derivatives, pdfs, missing,
    filenameCollisions, exactDuplicates
});
