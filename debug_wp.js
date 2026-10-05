const fs = require('fs');
const content = fs.readFileSync('/tmp/wp-audit-tmp/english/entertainlawyers-english.sql', 'utf-8');

const taxRegex = new RegExp(`INSERT INTO \\\`wpfn_term_taxonomy\\\` VALUES (.*?);`, 'g');
let match = taxRegex.exec(content);
if (match) {
   console.log("Term Taxonomy Sample:");
   console.log(match[1].substring(0, 200));
}

const relRegex = new RegExp(`INSERT INTO \\\`wpfn_term_relationships\\\` VALUES (.*?);`, 'g');
match = relRegex.exec(content);
if (match) {
   console.log("Term Relationships Sample:");
   console.log(match[1].substring(0, 200));
}

const postsRegex = new RegExp(`INSERT INTO \\\`wpfn_posts\\\` VALUES (.*?);`, 'g');
match = postsRegex.exec(content);
if (match) {
   console.log("Posts Sample:");
   console.log(match[1].substring(0, 200));
}
