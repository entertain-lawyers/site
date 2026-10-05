const fs = require('fs');
const media = JSON.parse(fs.readFileSync('migration-staging-recovered/media.json', 'utf8'));
const docs = JSON.parse(fs.readFileSync('migration-staging-recovered/documents.json', 'utf8'));

const all = [...media, ...docs];

let uniqueB2Objects = new Set();
let uniqueImageObjects = 0;
let uniquePdfObjects = 0;

for (const m of all) {
    if (m.isMissing) continue;
    const b2Key = `${m.sha256}/${m.originalFilename}`;
    if (!uniqueB2Objects.has(b2Key)) {
        uniqueB2Objects.add(b2Key);
        if (m.extension === '.pdf') uniquePdfObjects++;
        else uniqueImageObjects++;
    }
}

console.log(`Unique B2 Objects (Hash + Filename): ${uniqueB2Objects.size}`);
console.log(`Unique Image Objects: ${uniqueImageObjects}`);
console.log(`Unique PDF Objects: ${uniquePdfObjects}`);
console.log(`Reconciliation (Images + PDFs): ${uniqueImageObjects + uniquePdfObjects}`);
console.log(`Reconciliation matches: ${uniqueB2Objects.size === (uniqueImageObjects + uniquePdfObjects)}`);

// Compare with my previous Phase 7 report number (6,657)
console.log(`Matches Phase 7 report (6657): ${uniqueB2Objects.size === 6657}`);

