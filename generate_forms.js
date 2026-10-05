const fs = require('fs');
const path = require('path');

const models = [
  { name: 'Semester', lower: 'semester', plural: 'semesters', fields: ['name', 'slug', 'order'] },
  { name: 'Subject', lower: 'subject', plural: 'subjects', fields: ['name', 'slug', 'order', 'semesterId'] },
  { name: 'Unit', lower: 'unit', plural: 'units', fields: ['name', 'title', 'order', 'subjectId'] }
];

for (const model of models) {
  const newDir = \`src/app/admin/study/\${model.plural}/new\`;
  fs.mkdirSync(newDir, { recursive: true });
  
  const editDir = \`src/app/admin/study/\${model.plural}/[id]/edit\`;
  fs.mkdirSync(editDir, { recursive: true });

  const parentField = model.fields.includes('semesterId') ? 'semesterId' : model.fields.includes('subjectId') ? 'subjectId' : null;

  // New Page
  const newPageContent = \`'use client';
import { useState${parentField ? ', useEffect' : ''} } from 'react';
import { useRouter } from 'next/navigation';
import { create\${model.name}Action } from '@/modules/admin/admin-\${model.lower}.actions';

export default function New\${model.name}Page() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  \${model.fields.includes('slug') ? 'const [slug, setSlug] = useState("");' : ''}
  \${model.fields.includes('title') ? 'const [title, setTitle] = useState("");' : ''}
  \${parentField ? \`const [\${parentField}, setParentId] = useState("");\` : ''}
  \${parentField ? \`const [parents, setParents] = useState<any[]>([]);\` : ''}

  \${parentField ? \`
  useEffect(() => {
    fetch('/api/admin/study-parents?type=\${parentField}').then(res => res.json()).then(data => setParents(data));
  }, []);
  \` : ''}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create\${model.name}Action({
      name,
      order,
      \${model.fields.includes('slug') ? 'slug,' : ''}
      \${model.fields.includes('title') ? 'title,' : ''}
      \${parentField ? \`\${parentField},\` : ''}
    });
    if (res.success) {
      router.push('/admin/study/\${model.plural}');
      router.refresh();
    } else {
      alert((res as any).error);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New \${model.name}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Name</label>
          <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        \${model.fields.includes('slug') ? \`
        <div>
          <label className="block text-sm font-bold mb-1">Slug (optional, lowercase/hyphens)</label>
          <input type="text" value={slug} onChange={e => setSlug(e.target.value)} pattern="^[a-z0-9-]+$" className="w-full border p-2 rounded" />
        </div>\` : ''}
        \${model.fields.includes('title') ? \`
        <div>
          <label className="block text-sm font-bold mb-1">Title (optional)</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-2 rounded" />
        </div>\` : ''}
        <div>
          <label className="block text-sm font-bold mb-1">Order</label>
          <input required type="number" value={order} onChange={e => setOrder(parseInt(e.target.value))} className="w-full border p-2 rounded" />
        </div>
        \${parentField ? \`
        <div>
          <label className="block text-sm font-bold mb-1">Parent</label>
          <select required value={\${parentField}} onChange={e => setParentId(e.target.value)} className="w-full border p-2 rounded">
            <option value="">Select Parent</option>
            {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>\` : ''}
        <button type="submit" className="bg-accent text-white px-4 py-2 rounded font-bold">Save</button>
      </form>
    </div>
  );
}
\`;
  fs.writeFileSync(path.join(newDir, 'page.tsx'), newPageContent);
}

console.log('Generated forms');
