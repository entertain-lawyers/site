const fs = require('fs');
const path = require('path');

const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));

for (const doc of docs) {
    if (doc.extension === '.pdf') {
        console.log(doc.originalFilename, doc.referencedBy);
    }
}
