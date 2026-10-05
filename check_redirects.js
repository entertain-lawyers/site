const fs = require('fs');
const redirects = JSON.parse(fs.readFileSync('migration-staging-recovered/redirects.json', 'utf8'));

const sources = new Map();
const duplicates = [];

for (const r of redirects) {
    if (!r.reviewRequired && r.targetPath) {
        if (sources.has(r.originalUrl)) {
            duplicates.push({
                A: sources.get(r.originalUrl),
                B: r
            });
        } else {
            sources.set(r.originalUrl, r);
        }
    }
}

console.log(JSON.stringify(duplicates, null, 2));
