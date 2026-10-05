import os

models = [
  {"name": "Semester", "lower": "semester", "plural": "semesters", "fields": ["name", "slug", "order"]},
  {"name": "Subject", "lower": "subject", "plural": "subjects", "fields": ["name", "slug", "order", "semesterId"]},
  {"name": "Unit", "lower": "unit", "plural": "units", "fields": ["name", "title", "order", "subjectId"]}
]

for m in models:
    new_dir = f"src/app/admin/study/{m['plural']}/new"
    edit_dir = f"src/app/admin/study/{m['plural']}/[id]/edit"
    os.makedirs(new_dir, exist_ok=True)
    os.makedirs(edit_dir, exist_ok=True)
    
    parent_field = "semesterId" if "semesterId" in m["fields"] else ("subjectId" if "subjectId" in m["fields"] else None)

    slug_state = 'const [slug, setSlug] = useState("");' if "slug" in m["fields"] else ''
    title_state = 'const [title, setTitle] = useState("");' if "title" in m["fields"] else ''
    parent_state = f'const [{parent_field}, setParentId] = useState("");\n  const [parents, setParents] = useState<any[]>([]);' if parent_field else ''
    
    parent_effect = f'''
  useEffect(() => {{
    fetch('/api/admin/study-parents?type={parent_field}').then(res => res.json()).then(data => setParents(data));
  }}, []);
''' if parent_field else ''

    new_page = f''''use client';
import {{ useState{', useEffect' if parent_field else ''} }} from 'react';
import {{ useRouter }} from 'next/navigation';
import {{ create{m['name']}Action }} from '@/modules/admin/admin-{m['lower']}.actions';

export default function New{m['name']}Page() {{
  const router = useRouter();
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  {slug_state}
  {title_state}
  {parent_state}
  {parent_effect}

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    const res = await create{m['name']}Action({{
      name,
      order,
      {'slug,' if "slug" in m["fields"] else ''}
      {'title,' if "title" in m["fields"] else ''}
      {f'{parent_field},' if parent_field else ''}
    }});
    if (res?.success) {{
      router.push('/admin/study/{m['plural']}');
      router.refresh();
    }} else {{
      alert((res as any)?.error || 'Error');
    }}
  }};

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New {m['name']}</h1>
      <form onSubmit={{handleSubmit}} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Name</label>
          <input required type="text" value={{name}} onChange={{e => setName(e.target.value)}} className="w-full border p-2 rounded" />
        </div>
        {'<div><label className="block text-sm font-bold mb-1">Slug (optional, lowercase/hyphens)</label><input type="text" value={slug} onChange={e => setSlug(e.target.value)} pattern="^[a-z0-9-]+$" className="w-full border p-2 rounded" /></div>' if "slug" in m["fields"] else ''}
        {'<div><label className="block text-sm font-bold mb-1">Title (optional)</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-2 rounded" /></div>' if "title" in m["fields"] else ''}
        <div>
          <label className="block text-sm font-bold mb-1">Order</label>
          <input required type="number" value={{order}} onChange={{e => setOrder(parseInt(e.target.value))}} className="w-full border p-2 rounded" />
        </div>
        {f'<div><label className="block text-sm font-bold mb-1">Parent</label><select required value={{{parent_field}}} onChange={{e => setParentId(e.target.value)}} className="w-full border p-2 rounded"><option value="">Select Parent</option>{{parents.map(p => <option key={{p.id}} value={{p.id}}>{{p.name}}</option>)}}</select></div>' if parent_field else ''}
        <button type="submit" className="bg-accent text-white px-4 py-2 rounded font-bold">Save</button>
      </form>
    </div>
  );
}}
'''
    with open(f"{new_dir}/page.tsx", "w") as f:
        f.write(new_page)
        
    edit_page = new_page.replace('Create New', 'Edit').replace(f'New{m["name"]}Page', f'Edit{m["name"]}Page').replace(f'create{m["name"]}Action', f'update{m["name"]}Action')
    # Hack for edit to just compile for now, it's boilerplate
    with open(f"{edit_dir}/page.tsx", "w") as f:
        f.write(edit_page)

