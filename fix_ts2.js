const fs = require('fs');

let f = 'src/app/admin/posts/page.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/post\.isPublished/g, "post.status === 'PUBLISHED'");
fs.writeFileSync(f, c);

const detailFiles = [
  'src/app/blogs/[id]/page.tsx',
  'src/app/historical-facts/[id]/page.tsx',
  'src/app/news/[id]/page.tsx'
];

for (let d of detailFiles) {
  let dc = fs.readFileSync(d, 'utf8');
  dc = dc.replace(/post=\{post\}/g, "post={{...post, author: post.author || { email: 'Unknown' }}}");
  fs.writeFileSync(d, dc);
}
console.log('Fixed2');
