import { getWordPressPostById, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatBSDate } from '@/lib/nepali-date';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const wpId = Number(params.id);
  if (isNaN(wpId)) return { title: 'Not Found' };
  
  const wpPost = await getWordPressPostById(wpId, 'ne');
  if (!wpPost || wpPost.status !== 'publish') return { title: 'Not Found' };
  
  return {
    title: `${wpPost.title.rendered} - नेपाली | Entertain Lawyers`,
  };
}

export default async function NepaliPostPage({ params }: { params: { id: string } }) {
  const wpId = Number(params.id);
  if (isNaN(wpId)) notFound();

  const wpPost = await getWordPressPostById(wpId, 'ne');
  if (!wpPost || wpPost.status !== 'publish') {
    notFound();
  }
  
  const mappedType = mapCategoryToType(wpPost.categories, 'ne');
  if (!mappedType.startsWith('NEPALI_')) {
    notFound();
  }
  
  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: mappedType,
    createdAt: new Date(wpPost.date),
    author: { email: `WP Author (${wpPost.author})`, role: 'EDITOR' }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'NEPALI_SAMANYA_SAMACHAR': return 'सामान्य समाचार';
      case 'NEPALI_ADALAT_SAMACHAR': return 'अदालत समाचार';
      case 'NEPALI_MUKHYA_SAMACHAR': return 'मुख्य समाचार';
      case 'NEPALI_NAJIRHARU': return 'नजिरहरु';
      case 'NEPALI_AIN_KANUN': return 'ऐन तथा कानून';
      case 'NEPALI_BLOG_BICHAR': return 'ब्लग, बिचार';
      default: return 'समाचार';
    }
  };

  return (
    <article className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <Link href="/nepali" className="inline-flex items-center text-accent font-bold mb-8 hover:underline font-nepali">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          मुख्य पृष्ठमा फर्कनुहोस्
        </Link>

        {/* Post Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-accent/10 text-accent dark:bg-accent/20 text-sm font-bold rounded-full font-nepali tracking-wider">
              {getTypeLabel(post.type)}
            </span>
            <time className="text-text-secondary font-medium font-nepali">
              {formatBSDate(post.createdAt)}
            </time>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy dark:text-white leading-tight mb-8 font-nepali">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 py-6 border-y border-black/5 dark:border-white/5">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold text-navy dark:text-white">
              {(post.author?.email)?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-bold text-navy dark:text-white text-lg">{(post.author?.email) || 'सम्पादक'}</p>
              <p className="text-sm text-text-secondary font-nepali">
                {post.author?.role === 'ADMIN' ? 'प्रशासक' : 'सम्पादक'}
              </p>
            </div>
          </div>
        </header>

        {/* Post Content */}
        <div
          className="prose prose-lg sm:prose-xl prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-navy dark:prose-headings:text-white prose-a:text-accent dark:prose-a:text-accent font-nepali prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </article>
  );
}
