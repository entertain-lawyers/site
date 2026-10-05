const fs = require('fs');
const loadJson = (filename) => {
    try { return JSON.parse(fs.readFileSync(filename, 'utf8')); } catch (e) { return []; }
};

const posts = loadJson('migration-staging-recovered/posts.json');

const news = posts.filter(p => p.type === 'NEWS');
const blogs = posts.filter(p => p.type === 'BLOG' || p.type === 'OPINION' || p.type === 'HISTORICAL_FACT');

console.log("NEWS:", news.length);
console.log("BLOGS/OPINION/FACTS:", blogs.length);
