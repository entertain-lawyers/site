const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

let modifiedCount = 0;

walkDir('./src/app/admin', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Fix outer wrapper nested padding (px-4 sm:px-6 lg:px-8 is fine for root, but not nested again)
  // We'll leave the outer layout to lg:p-8, but fix the inner card padding

  // Fix form/card padding
  content = content.replace(/p-8 sm:p-10/g, 'p-5 sm:p-8 lg:p-10');
  content = content.replace(/p-8/g, 'p-5 sm:p-8');
  
  // Clean up any double replacements (like p-5 sm:p-5 sm:p-8)
  content = content.replace(/p-5 sm:p-5 sm:p-8/g, 'p-5 sm:p-8');
  
  // 2. Fix header layouts (flex flex-col sm:flex-row) is already mostly there, 
  // but users/page.tsx and ads/page.tsx need it.
  content = content.replace(/flex justify-between items-center mb-8/g, 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4');
  
  // 3. Fix button touch targets (px-4 py-2 -> px-4 py-2.5 min-h-[44px])
  content = content.replace(/px-4 py-2 text-sm/g, 'px-4 py-2.5 min-h-[44px] text-sm');
  content = content.replace(/px-3\.5 py-2 text-sm/g, 'px-4 py-2.5 min-h-[44px] text-sm');
  content = content.replace(/px-5 py-2 text-sm/g, 'px-5 py-2.5 min-h-[44px] text-sm');
  content = content.replace(/px-6 py-2\.5 text-sm/g, 'px-6 py-2.5 min-h-[44px] text-sm');

  // Fix Reorder button in FAQs
  content = content.replace(/p-2 border rounded/g, 'p-2.5 border rounded min-h-[44px] min-w-[44px] flex items-center justify-center');
  
  // Fix raw text buttons in Users Client
  content = content.replace(/text-accent hover:text-accent-dark font-medium text-sm mr-4/g, 'text-accent hover:text-accent-dark font-medium text-sm mr-4 min-h-[44px] inline-flex items-center');
  content = content.replace(/text-red-500 hover:text-red-600 font-medium text-sm/g, 'text-red-500 hover:text-red-600 font-medium text-sm min-h-[44px] inline-flex items-center');
  
  // Add overflow-x-auto to missing tables (we checked ads/resources/users)
  // Let's manually do those or check if they already have it.
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Total files modified: ${modifiedCount}`);
