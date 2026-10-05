const fs = require('fs');
const resources = JSON.parse(fs.readFileSync('migration-staging-recovered/resources.json', 'utf8'));

const resA = resources.find(r => r.id === 4356 && r.site === 'english');
const resB = resources.find(r => r.id === 4552 && r.site === 'english');

console.log("Record A:", resA);
console.log("Record B:", resB);
