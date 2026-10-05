const fs = require('fs');

function extractData(filePath, prefix) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. term_taxonomy_id -> term_id mapping
  const termTaxToTerm = {};
  const taxRegex = new RegExp(`INSERT INTO \\\`${prefix}term_taxonomy\\\`.*?VALUES\\s*(.*?);`, 'sgi');
  let match;
  while ((match = taxRegex.exec(content)) !== null) {
    const rows = match[1].split('),(');
    rows.forEach(row => {
      const parts = row.replace(/[()']/g, '').split(',');
      if (parts.length >= 2) {
        termTaxToTerm[parts[0].trim()] = parts[1].trim(); // term_taxonomy_id -> term_id
      }
    });
  }

  // 2. object_id -> [term_taxonomy_ids]
  const postToTax = {};
  const termRelRegex = new RegExp(`INSERT INTO \\\`${prefix}term_relationships\\\`.*?VALUES\\s*(.*?);`, 'sgi');
  while ((match = termRelRegex.exec(content)) !== null) {
    const rows = match[1].split('),(');
    rows.forEach(row => {
      const parts = row.replace(/[()']/g, '').split(',');
      if(parts.length >= 2) {
        const objectId = parts[0].trim();
        const termTaxId = parts[1].trim();
        if (!postToTax[objectId]) postToTax[objectId] = [];
        postToTax[objectId].push(termTaxId);
      }
    });
  }

  // 3. Extract posts
  const posts = {};
  const postsRegex = new RegExp(`INSERT INTO \\\`${prefix}posts\\\`.*?VALUES\\s*(.*?);`, 'sgi');
  while ((match = postsRegex.exec(content)) !== null) {
    // split by lines to simplify since mysqldump often formats one row per line
    const rows = match[1].split(/\),\s*\(/);
    rows.forEach(row => {
      const parts = row.split(/','|',|,'|,/);
      if (parts.length > 20) {
        let id = parts[0]?.replace(/['(]/g, '').trim();
        let title = parts[5]?.replace(/'/g, '');
        let status = parts[7]?.replace(/'/g, '');
        let type = parts[parts.length - 3]?.replace(/'/g, '');

        if (status === 'publish' && type === 'post') {
           const taxIds = postToTax[id] || [];
           const catIds = taxIds.map(tid => termTaxToTerm[tid]).filter(x => x);
           posts[id] = { id, title, catIds };
        }
      }
    });
  }
  return posts;
}

const engPosts = extractData('/tmp/wp-audit-tmp/english/entertainlawyers-english.sql', 'wpfn_');

const byCategory = {};
Object.values(engPosts).forEach(post => {
  post.catIds.forEach(catId => {
    if (!byCategory[catId]) byCategory[catId] = [];
    byCategory[catId].push(post);
  });
});

fs.writeFileSync('wp_posts_grouped.json', JSON.stringify(byCategory, null, 2));
