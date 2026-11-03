/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateFAQAction } from '@/modules/admin/admin-faq.actions';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  loading: () => <div className="h-48 w-full rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-border animate-pulse" />
});
import { articleHtmlToEditorHtml, editorHtmlToArticleHtml } from '@/lib/editor-html';
import { MotionButton } from '@/components/motion/primitives';

export default function EditFaqClient({ faq }: { faq: any }) {
  const router = useRouter();
  const [question, setQuestion] = useState(faq.question);
  // Quill needs blank lines between blocks; saving converts back (see editor-html).
  const [answer, setAnswer] = useState(() => articleHtmlToEditorHtml(faq.answer || ''));
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>(faq.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await updateFAQAction({ id: faq.id, question, answer: editorHtmlToArticleHtml(answer), status, order: faq.order });

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
        <div><label htmlFor="faqs-question" className="block text-sm font-bold text-navy dark:text-white mb-2">Question</label><input id="faqs-question" required value={question} onChange={e => setQuestion(e.target.value)} className="w-full border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-navy dark:text-white p-3 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent" /></div>
        <div><label htmlFor="faqs-status" className="block text-sm font-bold text-navy dark:text-white mb-2">Status</label><select id="faqs-status" value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-navy dark:text-white p-3 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <div><label className="block text-sm font-bold text-navy dark:text-white mb-2">Answer (Rich Text)</label><RichTextEditor value={answer} onChange={setAnswer} /></div>
        <MotionButton type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save FAQ'}</MotionButton>
      </form>
    </div>
  );
}
