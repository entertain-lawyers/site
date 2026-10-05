import os

models = [
  {"name": "Event", "lower": "event", "plural": "events", "fields": ["title", "slug", "eventDate"]},
  {"name": "Publication", "lower": "publication", "plural": "publications", "fields": ["title", "slug", "publishDate"]},
  {"name": "Gallery", "lower": "gallery", "plural": "gallery", "fields": ["title"]},
  {"name": "FAQ", "lower": "faq", "plural": "faqs", "fields": ["question", "answer", "order"]}
]

for m in models:
    new_dir = f"src/app/admin/{m['plural']}/new"
    edit_dir = f"src/app/admin/{m['plural']}/[id]/edit"
    list_dir = f"src/app/admin/{m['plural']}"
    
    os.makedirs(new_dir, exist_ok=True)
    os.makedirs(edit_dir, exist_ok=True)
    os.makedirs(list_dir, exist_ok=True)

    # Basic List Page
    list_page = f''''use client';
import Link from 'next/link';

export default function {m['name']}ListPage() {{
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{m['name']}s</h1>
        <Link href="/admin/{m['plural']}/new" className="bg-accent text-white px-4 py-2 rounded font-bold">New {m['name']}</Link>
      </div>
      <p>Data goes here (Placeholder)</p>
    </div>
  );
}}
'''
    with open(f"{list_dir}/page.tsx", "w") as f:
        f.write(list_page)

    # Basic New Page
    new_page = f''''use client';
import {{ useState }} from 'react';
import {{ useRouter }} from 'next/navigation';
import {{ create{m['name']}Action }} from '@/modules/admin/admin-{m['lower']}.actions';

export default function New{m['name']}Page() {{
  const router = useRouter();
  const [data, setData] = useState<any>({{}});

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    const res = await create{m['name']}Action(data);
    if (res?.success) {{
      router.push('/admin/{m['plural']}');
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
          <label className="block text-sm font-bold mb-1">JSON Data Placeholder</label>
          <textarea value={{JSON.stringify(data, null, 2)}} onChange={{e => setData(JSON.parse(e.target.value))}} className="w-full border p-2 rounded h-48 font-mono" />
        </div>
        <button type="submit" className="bg-accent text-white px-4 py-2 rounded font-bold">Save</button>
      </form>
    </div>
  );
}}
'''
    with open(f"{new_dir}/page.tsx", "w") as f:
        f.write(new_page)

    # Basic Edit Page
    edit_page = f''''use client';
import {{ useState, use }} from 'react';
import {{ useRouter }} from 'next/navigation';
import {{ update{m['name']}Action }} from '@/modules/admin/admin-{m['lower']}.actions';

export default function Edit{m['name']}Page({{ params }}: {{ params: Promise<{{ id: string }}> }}) {{
  const router = useRouter();
  const id = use(params).id;
  const [data, setData] = useState<any>({{ id }});

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    const res = await update{m['name']}Action(data);
    if (res?.success) {{
      router.push('/admin/{m['plural']}');
      router.refresh();
    }} else {{
      alert((res as any)?.error || 'Error');
    }}
  }};

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit {m['name']}</h1>
      <form onSubmit={{handleSubmit}} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">JSON Data Placeholder</label>
          <textarea value={{JSON.stringify(data, null, 2)}} onChange={{e => setData(JSON.parse(e.target.value))}} className="w-full border p-2 rounded h-48 font-mono" />
        </div>
        <button type="submit" className="bg-accent text-white px-4 py-2 rounded font-bold">Save</button>
      </form>
    </div>
  );
}}
'''
    with open(f"{edit_dir}/page.tsx", "w") as f:
        f.write(edit_page)

print("Generated crude UI templates to pass TS build temporarily.")
