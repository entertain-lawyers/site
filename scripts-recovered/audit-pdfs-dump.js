const fs = require('fs');
const path = require('path');

const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/documents.json'), 'utf8'));
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/posts.json'), 'utf8'));
const resources = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/resources.json'), 'utf8'));

console.log("== PDF FILENAMES ==");
docs.filter(d => d.extension === '.pdf').forEach(d => console.log(d.originalFilename));

console.log("\n== ALL POSTS/RESOURCES TITLES (Potential Matches) ==");
const all = [...posts, ...resources];
all.forEach(p => {
    if (p.title.includes('Semester') || p.title.includes('Sem') || p.title.includes('Syllabus') || p.title.includes('Question') || p.title.includes('Moot')) {
        console.log(`[${p.type}] ${p.title} (WP ID: ${p.wordpressPostId})`);
    }
});
