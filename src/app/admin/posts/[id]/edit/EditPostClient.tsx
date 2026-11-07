'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePostAction } from '@/modules/admin/admin-post.actions';
import Link from 'next/link';
import { Eye, CheckCircle2, ExternalLink } from 'lucide-react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  loading: () => <div className="h-96 w-full rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-border animate-pulse" />
});
import WordPressCredentialsNotice from '@/components/admin/WordPressCredentialsNotice';
import FeaturedImagePanel from '@/components/admin/FeaturedImagePanel';
import AuthorSelect from '@/components/admin/AuthorSelect';
import type { AuthorOption } from '@/lib/content-authors';
import type { FeaturedImageSelection } from '@/lib/wordpress-media';
import { writePostPreviewDraft, type PostType } from '@/lib/post-preview';
import { articleHtmlToEditorHtml, editorHtmlToArticleHtml } from '@/lib/editor-html';
import { htmlToText } from '@/lib/html';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

const POST_TYPE_LABELS: Record<string, string> = {
  NEWS: 'NEWS',
  BLOG: 'BLOG',
  OPINION: 'OPINION',
  FACT: 'FACT',
  PERSONALITY: 'PERSONALITY',
  NEPALI_SAMANYA_SAMACHAR: 'सामान्य समाचार',
  NEPALI_ADALAT_SAMACHAR: 'अदालत समाचार',
  NEPALI_MUKHYA_SAMACHAR: 'मुख्य समाचार',
  NEPALI_NAJIRHARU: 'नजिरहरु',
  NEPALI_AIN_KANUN: 'ऐन तथा कानून',
  NEPALI_BLOG_BICHAR: 'ब्लग, बिचार, अन्य',
};

interface EditablePost {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  lang: 'en' | 'ne';
  /** WordPress category ids currently on the post. */
  categories: number[];
  /** WordPress `featured_media` id; 0 when the post has none. */
  featuredMediaId: number;
  /** The current featured image, loaded on the server so it survives reloads. */
  featuredImage: FeaturedImageSelection | null;
  /** Local user linked to WordPress's current author, or '' when unmapped. */
  currentAuthorUserId: string;
  /** WordPress's author name when no local user is linked. */
  currentWpAuthorName: string | null;
}

const TYPE_OPTIONS: Record<'en' | 'ne', Array<[PostType, string]>> = {
  en: [
    ['NEWS', 'News'],
    ['BLOG', 'Blog'],
    ['OPINION', 'Opinion'],
    ['FACT', 'Historical Fact'],
    ['PERSONALITY', 'Legal Personality'],
  ],
  ne: [
    ['NEPALI_SAMANYA_SAMACHAR', 'Nepali: सामान्य समाचार'],
    ['NEPALI_ADALAT_SAMACHAR', 'Nepali: अदालत समाचार'],
    ['NEPALI_MUKHYA_SAMACHAR', 'Nepali: मुख्य समाचार'],
    ['NEPALI_NAJIRHARU', 'Nepali: नजिरहरु'],
    ['NEPALI_AIN_KANUN', 'Nepali: ऐन तथा कानून'],
    ['NEPALI_BLOG_BICHAR', 'Nepali: ब्लग, बिचार, अन्य'],
  ],
};

export default function EditPostClient({
  post,
  authors = [],
  authorMappingAvailable = true,
  canSave = true,
  uploadBlockedReason = null,
}: {
  post: EditablePost;
  authors?: AuthorOption[];
  authorMappingAvailable?: boolean;
  canSave?: boolean;
  uploadBlockedReason?: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  // Quill needs blank lines between paragraphs; preview and save convert back.
  const [content, setContent] = useState(() => articleHtmlToEditorHtml(post.content));
  const [type, setType] = useState<PostType>(post.type as PostType);
  const [isPublished, setIsPublished] = useState(post.status === 'PUBLISHED');
  const [featuredImage, setFeaturedImage] = useState<FeaturedImageSelection | null>(post.featuredImage);
  const [authorUserId, setAuthorUserId] = useState(post.currentAuthorUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [publishedPost, setPublishedPost] = useState<{ id: string; url?: string; isPublished: boolean } | null>(null);

  // Authors/editors from User Management and Roles (Admin & Editor)
  const authorOptions = authors;
  const selectedAuthorId = authorOptions.some((author) => author.id === authorUserId)
    ? authorUserId
    : '';
  const selectedAuthor = authorOptions.find((author) => author.id === selectedAuthorId);
  const isSelectedAuthorLinked = Boolean(
    post.lang === 'ne' ? selectedAuthor?.wpAuthorIdNe : selectedAuthor?.wpAuthorIdEn
  );

  const handlePreview = () => {
    const selectedAuthorObj = authors.find((a) => a.id === selectedAuthorId) || null;
    writePostPreviewDraft({
      title: title || 'Untitled Draft',
      content: editorHtmlToArticleHtml(content),
      type: POST_TYPE_LABELS[type] || type,
      featuredImage: featuredImage?.url ?? null,
      editorUrl: `/admin/posts/${post.id}/edit?lang=${post.lang}`,
      author: selectedAuthorObj ? {
        id: selectedAuthorObj.id,
        name: selectedAuthorObj.name,
        email: selectedAuthorObj.email,
        image: selectedAuthorObj.image,
        bio: selectedAuthorObj.bio,
        website: selectedAuthorObj.website,
        role: selectedAuthorObj.role,
      } : null,
    });
    window.open('/preview', 'el-post-preview')?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Quill's semantic HTML renders an empty editor as <p></p> (and it used
    // to be <p><br></p>), so tag-strip instead of string-comparing. An
    // image-only post still counts as content.
    if (!htmlToText(content) && !/<img\b/i.test(content)) {
      setError('Content cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await updatePostAction({
        id: Number(post.id),
        title,
        content: editorHtmlToArticleHtml(content),
        // Omit an unchanged type (which can be UNKNOWN for categories the
        // type list does not map) so the schema accepts it.
        type: type === post.type ? undefined : type,
        isPublished,
        lang: post.lang,
        // Send the author when one is selected: a mapped one keeps its own
        // WordPress account, an unmapped one uses the site's publishing
        // account. Omitted leaves the current WordPress author untouched.
        ...(selectedAuthorId ? { authorUserId: selectedAuthorId } : {}),
        // Only rewrite categories when the admin actually changed the type;
        // otherwise keep WordPress's own categories (including any the type
        // list does not map, such as "विचार").
        categories: type === post.type ? post.categories : undefined,
        // Only send the featured image when it changed; 0 removes it.
        ...((featuredImage?.id ?? 0) !== post.featuredMediaId ? { featuredMediaId: featuredImage?.id ?? 0 } : {}),
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update post');
      }

      setPublishedPost({
        id: res.data.id || String(post.id),
        url: res.data.url,
        isPublished: isPublished || res.data.status === 'publish',
      });
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-editor-page py-10 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto w-full flex-1 flex flex-col min-h-[calc(100vh-2.5rem)] lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <div className="mb-10 shrink-0">
        <Link href="/admin/posts" className="inline-flex items-center text-sm font-bold text-text-secondary hover:text-accent mb-6 transition-colors group">
          <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Posts
        </Link>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Edit Post</h1>
      </div>

      {!canSave && <WordPressCredentialsNotice />}

      <AnimatePresence initial={false}>
      {publishedPost && (
        <Appear key="published-success">
          <div className="mb-6 p-5 bg-green-50 text-green-900 rounded-2xl border border-green-200 dark:bg-green-950/40 dark:border-green-900/60 dark:text-green-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-bold text-navy dark:text-white text-base">
                  {publishedPost.isPublished ? 'Post updated and published!' : 'Draft updated successfully!'}
                </p>
                <p className="text-sm text-text-secondary dark:text-zinc-300">
                  {publishedPost.isPublished
                    ? 'Your changes are live on the website.'
                    : 'Your draft has been saved. You can continue editing or view it from the drafts list.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {publishedPost.url && publishedPost.isPublished && (
                <a
                  href={publishedPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm"
                >
                  <span>View Post</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Link
                href="/admin/posts"
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-navy dark:text-white hover:border-accent transition-colors"
              >
                Back to Posts
              </Link>
            </div>
          </div>
        </Appear>
      )}
      {error && (
        <Appear key="error">
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300 font-medium">
          {error}
        </div>
        </Appear>
      )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-10 lg:min-h-0 lg:grid lg:grid-cols-[minmax(0,860px)_340px] lg:justify-center lg:gap-12 lg:items-stretch lg:grid-rows-[minmax(0,1fr)]">

        {/* Left Column: Main Editor — same width as the public article column */}
        <div className="min-w-0 flex flex-col space-y-8 h-full lg:min-h-0">
          <div>
            <label htmlFor="title" className="block text-sm font-bold text-navy dark:text-white mb-2">Title</label>
            <input
              type="text"
              id="title"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Add title"
              className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors sm:text-lg font-bold"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Content</label>
            <RichTextEditor value={content} onChange={setContent} fillHeight />
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="w-full space-y-8 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
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

            <div>
              <label htmlFor="author" className="block text-sm font-bold text-navy dark:text-white mb-2">
                Author
              </label>
              <AuthorSelect
                authors={authorOptions}
                value={selectedAuthorId}
                onChange={setAuthorUserId}
                disabled={!authorMappingAvailable}
                placeholder={
                  !authorMappingAvailable
                    ? 'Author mapping unavailable (migration pending)'
                    : post.currentWpAuthorName
                      ? `Unmapped: ${post.currentWpAuthorName} (WordPress)`
                      : undefined
                }
                emptyMessage={
                  !authorMappingAvailable
                    ? 'Author mapping is temporarily unavailable because database migrations are pending.'
                    : 'No eligible authors found. Create editors in Admin → Users.'
                }
                hint={
                  !authorMappingAvailable
                    ? 'Author mapping is temporarily unavailable because database migration 20261101000000 has not been applied yet. Saving leaves the current WordPress author unchanged.'
                    : selectedAuthor
                      ? isSelectedAuthorLinked
                        ? 'The post is published under this author in WordPress. You remain the editor in the audit log.'
                        : 'This author has no WordPress author mapping, so the post will be published under the site\'s WordPress publishing account and credited to them in the audit log. Map them in Admin → Users to publish under their own byline.'
                      : post.currentWpAuthorName
                        ? `Currently credited to WordPress user “${post.currentWpAuthorName}”, which is not linked to a local account. Saving without choosing an author keeps it.`
                        : 'Select an editor or administrator to credit as the author of this post.'
                }
              />
            </div>

            <MotionButton
              type="submit"
              disabled={loading || !canSave}
              className="w-full bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-xl font-bold transition-[background-color,border-color,color,box-shadow,opacity] transform shadow-lg shadow-accent/20 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Saving...' : 'Update Post'}
            </MotionButton>

            <button
              type="button"
              onClick={handlePreview}
              className="w-full inline-flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-navy dark:text-white hover:border-gold hover:text-gold px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </button>
            <p className="text-xs text-text-secondary">
              Opens the post on the live site view (new tab) without saving your changes.
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
                {!TYPE_OPTIONS[post.lang].some(([value]) => value === type) && (
                  <option value={type}>Keep current category</option>
                )}
                {TYPE_OPTIONS[post.lang].map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <FeaturedImagePanel
            lang={post.lang}
            value={featuredImage}
            onChange={setFeaturedImage}
            uploadBlockedReason={uploadBlockedReason}
          />


        </div>
      </form>
    </div>
  );
}
