const fs = require('fs');

function extractData(filePath, prefix) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract posts (ID, title, content)
  const posts = {};
  const postsRegex = new RegExp(`INSERT INTO \`${prefix}posts\` VALUES (.*?);`, 'g');
  let match;
  while ((match = postsRegex.exec(content)) !== null) {
    const rows = match[1].split('),(');
    rows.forEach(row => {
      // Split correctly considering quotes
      const parts = row.split(/','|',|,'|,/);
      if (parts.length > 20) {
        const id = parts[0]?.replace(/'/g, '').replace(/^\(/, '');
        const titlePart = row.match(/, ?'([^']*)', ?'[^']*', ?'publish'/); // heuristic to get title before publish
        let title = '';
        if (titlePart) title = titlePart[1];
        
        // Alternative title extraction
        const possibleTitle = parts[5]?.replace(/'/g, '');
        
        const type = parts[parts.length - 3]?.replace(/'/g, '');
        const status = parts[7]?.replace(/'/g, '');
        if (type === 'post' && status === 'publish' && id) {
           // simple title heuristic, index 5 is typically title
           posts[id] = { id, title: possibleTitle, categories: [] };
        }
      }
    });
  }

  // Extract relationships
  const termRelRegex = new RegExp(`INSERT INTO \`${prefix}term_relationships\` VALUES (.*?);`, 'g');
  while ((match = termRelRegex.exec(content)) !== null) {
    const rows = match[1].split('),(');
    rows.forEach(row => {
      const parts = row.replace(/[()]/g, '').split(',');
      const objectId = parts[0];
      const termTaxId = parts[1];
      if (posts[objectId]) {
        posts[objectId].categories.push(parseInt(termTaxId, 10));
      }
    });
  }
  
  return posts;
}

const engPosts = extractData('/tmp/wp-audit-tmp/english/entertainlawyers-english.sql', 'wpfn_');

// Group by category
const byCategory = {};
Object.values(engPosts).forEach(post => {
  post.categories.forEach(catId => {
    if (!byCategory[catId]) byCategory[catId] = [];
    byCategory[catId].push(post);
  });
});

fs.writeFileSync('wp_posts_grouped.json', JSON.stringify(byCategory, null, 2));
console.log("Extracted grouped posts successfully");
