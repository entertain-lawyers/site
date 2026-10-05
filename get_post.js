const fs = require('fs');
const posts = JSON.parse(fs.readFileSync('migration-staging-recovered/posts.json', 'utf8'));
const resources = JSON.parse(fs.readFileSync('migration-staging-recovered/resources.json', 'utf8'));

const resA = posts.find(r => r.wordpressPostId === 4356) || resources.find(r => r.wordpressPostId === 4356);
const resB = posts.find(r => r.wordpressPostId === 4552) || resources.find(r => r.wordpressPostId === 4552);

console.log("Record A:", resA);
console.log("Record B:", resB);
