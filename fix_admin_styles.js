const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove glowing orbs entirely (divs containing blur-[30px] or blur-[40px])
  content = content.replace(/<div className="absolute[^>]*blur-\[30px\][^>]*><\/div>\n?\s*/g, '');
  content = content.replace(/<div className="absolute[^>]*blur-\[40px\][^>]*><\/div>\n?\s*/g, '');

  // 2. Reduce border-radius
  content = content.replace(/rounded-3xl/g, 'rounded-2xl');

  // 3. Simplify icon containers (remove shadow-[inset...])
  content = content.replace(/shadow-\[inset_0_0_0_1px_rgba[^\]]*\]/g, '');

  // 4. Simplify Total Revenue gradient card
  content = content.replace(/bg-gradient-to-br from-navy to-\[\#112240\] dark:from-zinc-900 dark:to-black/g, 'bg-navy dark:bg-zinc-900');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walk('./src/app/admin');
walk('./src/components/admin');
console.log('Done');
