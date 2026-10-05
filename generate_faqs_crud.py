import os

list_faqs = """import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeleteFaqButton from './DeleteFaqButton';
import ReorderFaqButton from './ReorderFaqButton';

export default async function AdminFaqsPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const faqs = await prisma.fAQ.findMany({
    orderBy: { order: 'asc' }
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">FAQs</h1>
          <p className="mt-2 text-text-secondary font-medium">Manage Frequently Asked Questions.</p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/admin/faqs/new" className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5">
            Create FAQ
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <tr>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Question</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Order</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {faqs.length > 0 ? (
              faqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-navy dark:text-white max-w-md truncate">{faq.question}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${faq.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {faq.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-1">
                    <ReorderFaqButton id={faq.id} direction="UP" />
                    <ReorderFaqButton id={faq.id} direction="DOWN" />
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/faqs/${faq.id}/edit`} className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm">Edit</Link>
                      <DeleteFaqButton id={faq.id} />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center">
                  <p className="text-sm text-text-secondary">No FAQs found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
"""

reorder_faq = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reorderFaqAction } from '@/modules/admin/admin-faq.actions';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function ReorderFaqButton({ id, direction }: { id: string, direction: 'UP' | 'DOWN' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const handleReorder = async () => {
    setLoading(true);
    const res = await reorderFaqAction({ id, direction });
    if (res?.success) router.refresh();
    else alert((res as any)?.error || 'Error reordering FAQ');
    setLoading(false);
  };
  return (
    <button onClick={handleReorder} disabled={loading} className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50">
      {direction === 'UP' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
    </button>
  );
}
"""

delete_faq = """'use client';
import { useState } from 'react';
import { deleteFaqAction } from '@/modules/admin/admin-faq.actions';

export default function DeleteFaqButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    setLoading(true);
    const res = await deleteFaqAction({ id });
    if (!res?.success) alert((res as any)?.error || 'Error deleting FAQ');
    setLoading(false);
  };
  return (
    <button onClick={handleDelete} disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">
      Delete
    </button>
  );
}
"""

new_faq = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFaqAction } from '@/modules/admin/admin-faq.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';

export default function NewFaqPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>('PUBLISHED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await createFaqAction({ question, answer, status });

    if (res?.success) {
      router.push('/admin/faqs');
      router.refresh();
    } else {
      setError((res as any)?.error || 'Error creating FAQ');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Create FAQ</h1>
      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label className="block text-sm font-bold mb-2">Question</label><input required value={question} onChange={e => setQuestion(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <div><label className="block text-sm font-bold mb-2">Answer (Rich Text)</label><RichTextEditor value={answer} onChange={setAnswer} /></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save FAQ'}</button>
      </form>
    </div>
  );
}
"""

edit_faq = """import { prisma } from '@/lib/prisma';
import EditFaqClient from './EditFaqClient';
import { notFound } from 'next/navigation';

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const faq = await prisma.fAQ.findUnique({ where: { id } });
  if (!faq) notFound();
  return <EditFaqClient faq={faq} />;
}
"""

edit_faq_client = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateFaqAction } from '@/modules/admin/admin-faq.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';

export default function EditFaqClient({ faq }: { faq: any }) {
  const router = useRouter();
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer || '');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>(faq.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await updateFaqAction({ id: faq.id, question, answer, status });

    if (res?.success) {
      router.push('/admin/faqs');
      router.refresh();
    } else {
      setError((res as any)?.error || 'Error updating FAQ');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Edit FAQ</h1>
      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label className="block text-sm font-bold mb-2">Question</label><input required value={question} onChange={e => setQuestion(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <div><label className="block text-sm font-bold mb-2">Answer (Rich Text)</label><RichTextEditor value={answer} onChange={setAnswer} /></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save FAQ'}</button>
      </form>
    </div>
  );
}
"""

with open('src/app/admin/faqs/page.tsx', 'w') as f: f.write(list_faqs)
with open('src/app/admin/faqs/DeleteFaqButton.tsx', 'w') as f: f.write(delete_faq)
with open('src/app/admin/faqs/ReorderFaqButton.tsx', 'w') as f: f.write(reorder_faq)
with open('src/app/admin/faqs/new/page.tsx', 'w') as f: f.write(new_faq)
with open('src/app/admin/faqs/[id]/edit/page.tsx', 'w') as f: f.write(edit_faq)
with open('src/app/admin/faqs/[id]/edit/EditFaqClient.tsx', 'w') as f: f.write(edit_faq_client)

print("Generated FAQs UI")
