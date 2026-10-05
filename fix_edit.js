const fs = require('fs');

const files = [
  { p: 'src/app/admin/study/semesters/[id]/edit/page.tsx', m: 'Semester' },
  { p: 'src/app/admin/study/subjects/[id]/edit/page.tsx', m: 'Subject' },
  { p: 'src/app/admin/study/units/[id]/edit/page.tsx', m: 'Unit' }
];

for (const f of files) {
  let c = fs.readFileSync(f.p, 'utf8');
  c = c.replace(`export default function Edit${f.m}Page() {`, `import { use } from 'react';\n\nexport default function Edit${f.m}Page({ params }: { params: Promise<{ id: string }> }) {\n  const resolvedParams = use(params);\n  const id = resolvedParams.id;`);
  c = c.replace(`update${f.m}Action({`, `update${f.m}Action({\n      id,`);
  fs.writeFileSync(f.p, c);
}

console.log('Fixed edit forms');
