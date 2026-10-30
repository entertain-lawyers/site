'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFAQAction } from '@/modules/admin/admin-faq.actions';
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

    const res = await createFAQAction({ question, answer, status, order: 0 });

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
        <div><label htmlFor="faqs-question" className="block text-sm font-bold mb-2">Question</label><input id="faqs-question" required value={question} onChange={e => setQuestion(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label htmlFor="faqs-status" className="block text-sm font-bold mb-2">Status</label><select id="faqs-status" value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <div><label className="block text-sm font-bold mb-2">Answer (Rich Text)</label><RichTextEditor value={answer} onChange={setAnswer} /></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save FAQ'}</button>
      </form>
    </div>
  );
}
