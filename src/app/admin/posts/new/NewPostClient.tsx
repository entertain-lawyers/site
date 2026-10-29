'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { createPostAction } from '@/modules/admin/admin-post.actions';
import { writePostPreviewDraft, type PostType } from '@/lib/post-preview';

const POST_TYPE_LABELS: Record<string, string> = {
  NEWS: 'NEWS',
  BLOG: 'BLOG',
  FACT: 'FACT',
  PERSONALITY: 'PERSONALITY',
  NEPALI_SAMANYA_SAMACHAR: 'सामान्य समाचार',
  NEPALI_ADALAT_SAMACHAR: 'अदालत समाचार',
  NEPALI_MUKHYA_SAMACHAR: 'मुख्य समाचार',
  NEPALI_NAJIRHARU: 'नजिरहरु',
  NEPALI_AIN_KANUN: 'ऐन तथा कानून',
  NEPALI_BLOG_BICHAR: 'ब्लग, बिचार, अन्य',
};

export default function NewPostClient({ defaultLang = 'en' }: { defaultLang?: 'en' | 'ne' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PostType>(
    defaultLang === 'ne' ? 'NEPALI_SAMANYA_SAMACHAR' : 'NEWS'
  );
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const handlePreview = () => {
    // Eyebrow label mirrors the real detail pages (Nepali types show
    // their Nepali labels; English types show NEWS/BLOG/…).
    writePostPreviewDraft({
      title: title || 'Untitled Draft',
      content,
      type: POST_TYPE_LABELS[type] || type,
      editorUrl: `/admin/posts/new${defaultLang === 'ne' ? '?lang=ne' : ''}`,
    });
    window.open('/preview', 'el-post-preview')?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content === '<p><br></p>') {
      setError('Content cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await createPostAction({
        title,
        type,
        content,
        isPublished,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to create post');
      }

      router.push('/admin/posts');
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="admin-editor-page py-10 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto">
      <div className="mb-10">
        <Link href="/admin/posts" className="inline-flex items-center text-sm font-bold text-text-secondary hover:text-accent mb-6 transition-colors group">
          <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Posts
        </Link>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Create New Post</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,860px)_340px] lg:justify-center lg:gap-12">

        {/* Left Column: Main Editor — same width as the public article column */}
        <div className="min-w-0 space-y-8">
          <div>
            <label htmlFor="title" className="block text-sm font-bold text-navy dark:text-white mb-2">Title</label>
            <input
              type="text"
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors sm:text-lg font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Content</label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="w-full space-y-8">
          <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-2xl border border-black/5 dark:border-white/5 space-y-6">
            <h3 className="font-bold text-navy dark:text-white border-b border-black/5 dark:border-white/10 pb-3">Publish</h3>

            <div className="flex items-center gap-3">
              <input
                id="isPublished"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-5 w-5 rounded border-black/20 dark:border-white/20 text-accent focus:ring-accent bg-white dark:bg-zinc-900 transition-colors"
              />
              <label htmlFor="isPublished" className="block text-sm font-bold text-navy dark:text-white cursor-pointer select-none">
                Publish immediately
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 shadow-lg shadow-accent/20 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Saving...' : 'Save Post'}
            </button>

            <button
              type="button"
              onClick={handlePreview}
              className="w-full inline-flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-navy dark:text-white hover:border-gold hover:text-gold px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </button>
            <p className="text-xs text-text-secondary">
              Opens the post on the live site view (new tab) without saving it.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-2xl border border-black/5 dark:border-white/5 space-y-6">
            <h3 className="font-bold text-navy dark:text-white border-b border-black/5 dark:border-white/10 pb-3">Format</h3>
            <div>
              <label htmlFor="type" className="block text-sm font-bold text-navy dark:text-white mb-2">Post Type</label>
              <select
                id="type"
                required
                value={type}
                onChange={(e) => setType(e.target.value as PostType)}
                className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors sm:text-sm font-medium"
              >
                {[
                  ...(defaultLang === 'ne'
                    ? [
                        ['NEPALI_SAMANYA_SAMACHAR', 'Nepali: सामान्य समाचार'],
                        ['NEPALI_ADALAT_SAMACHAR', 'Nepali: अदालत समाचार'],
                        ['NEPALI_MUKHYA_SAMACHAR', 'Nepali: मुख्य समाचार'],
                        ['NEPALI_NAJIRHARU', 'Nepali: नजिरहरु'],
                        ['NEPALI_AIN_KANUN', 'Nepali: ऐन तथा कानून'],
                        ['NEPALI_BLOG_BICHAR', 'Nepali: ब्लग, बिचार, अन्य'],
                      ]
                    : [
                        ['NEWS', 'News'],
                        ['BLOG', 'Blog'],
                        ['FACT', 'Historical Fact'],
                        ['PERSONALITY', 'Legal Personality'],
                      ]),
                ].map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
            <h3 className="font-bold text-navy dark:text-white border-b border-black/5 dark:border-white/10 pb-3">Featured Image</h3>
            <p className="text-sm text-text-secondary">
              Featured image uploads are currently disabled in this panel. Please upload and set the featured image directly in the <a href="https://entertainlawyers.com/wp-admin" target="_blank" rel="noreferrer" className="text-accent hover:underline">WordPress Dashboard</a>.
            </p>
          </div>


        </div>
      </form>
    </div>
  );
}
