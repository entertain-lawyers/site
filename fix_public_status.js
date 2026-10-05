const fs = require('fs');

const files = [
  'src/app/read/[resourceId]/page.tsx',
  'src/app/resources/[id]/page.tsx',
  'src/app/resources/page.tsx',
  'src/app/sitemap.ts',
  'src/app/study/page.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let c = fs.readFileSync(f, 'utf8');
  
  // For findUnique, we change it to findFirst with status: 'PUBLISHED'
  c = c.replace(/prisma\.resource\.findUnique\(\{\s*where:\s*\{\s*id:\s*params\.resourceId\s*\}\s*,\s*include/g, "prisma.resource.findFirst({\n    where: { id: params.resourceId, status: 'PUBLISHED' },\n    include");
  c = c.replace(/prisma\.resource\.findUnique\(\{\s*where:\s*\{\s*id:\s*params\.id\s*\}\s*,\s*include/g, "prisma.resource.findFirst({\n    where: { id: params.id, status: 'PUBLISHED' },\n    include");
  c = c.replace(/prisma\.resource\.findUnique\(\{\s*where:\s*\{\s*id:\s*params\.id\s*\}\s*\}\)/g, "prisma.resource.findFirst({ where: { id: params.id, status: 'PUBLISHED' } })");
  c = c.replace(/prisma\.resource\.findUnique\(\{\s*where:\s*\{\s*id:\s*params\.resourceId\s*\}\s*\}\)/g, "prisma.resource.findFirst({ where: { id: params.resourceId, status: 'PUBLISHED' } })");
  
  // For findMany, we inject status: 'PUBLISHED' into the where clause.
  c = c.replace(/where:\s*\{/g, "where: { status: 'PUBLISHED', ");
  c = c.replace(/where: \{\s*status: 'PUBLISHED', \s*status: 'PUBLISHED',/g, "where: { status: 'PUBLISHED',"); // Deduplicate if run twice
  
  fs.writeFileSync(f, c);
}
console.log('Fixed public status');
