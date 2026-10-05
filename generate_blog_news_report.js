const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const posts = await prisma.post.findMany({ select: { id: true, title: true, type: true }});
  
  let catsData = {};
  if (fs.existsSync('categories_data.json')) {
    catsData = JSON.parse(fs.readFileSync('categories_data.json', 'utf8'));
  } else if (fs.existsSync('posts_data.json')) {
    catsData = JSON.parse(fs.readFileSync('posts_data.json', 'utf8'));
  }
  
  const ledger = JSON.parse(fs.readFileSync('migration-staging-recovered/posts.json', 'utf8'));
  
  console.log('| WP ID | Current PostType | Source category | Expected PostType | Changed? |');
  console.log('|---|---|---|---|---|');
  
  let matchCount = 0;
  for (const post of posts) {
    // skip non-editorial (historical facts, gallery, etc.) if you want, but they are all in Post model.
    // wait, facts are FACT, gallery is Gallery model. The Post model has NEWS, BLOG, OPINION, NEPALI_*
    
    // find in ledger
    const ledgerEntry = ledger.find(l => l.title === post.title || l.id === post.id);
    if (!ledgerEntry) continue;
    
    const wpId = String(ledgerEntry.wordpressPostId);
    let sourceCat = 'Unknown';
    let expectedType = post.type;
    
    if (catsData[wpId]) {
      const entry = catsData[wpId];
      if (Array.isArray(entry.categories)) {
          sourceCat = entry.categories.map(c => typeof c === 'string' ? c : c[1]).join(', ');
      } else if (entry.category) {
          sourceCat = typeof entry.category === 'string' ? entry.category : JSON.stringify(entry.category);
      }
      
      const sc = sourceCat.toLowerCase();
      if (sc.includes('blog')) expectedType = 'BLOG';
      else if (sc.includes('opinion')) expectedType = 'OPINION';
      else if (sc.includes('news')) expectedType = 'NEWS';
    }
    
    const changed = post.type !== expectedType ? 'No (Need Fix)' : 'No';
    // wait, I already changed WP 2720 to BLOG, so for that one, Current PostType is BLOG, Expected is BLOG. So Changed = Yes (Fixed).
    let changedStatus = 'No';
    if (wpId === '2720' && post.type === 'BLOG') changedStatus = 'Yes (Fixed)';
    else if (post.type !== expectedType) changedStatus = 'No (Need Fix)';
    
    console.log(`| ${wpId} | ${post.type} | ${sourceCat} | ${expectedType} | ${changedStatus} |`);
  }
}
run().then(() => prisma.$disconnect());
