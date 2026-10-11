import { getWordPressPostById, getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatBSDate } from '@/lib/nepali-date';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wpId = Number(id);
  if (isNaN(wpId)) return { title: 'Not Found' };

  const wpPost = await getWordPressPostById(wpId, 'ne');
  if (!wpPost || wpPost.status !== 'publish') return { title: 'Not Found' };

  return {
    title: `${wpPost.title.rendered} - नेपाली | Entertain Lawyers`,
  };
}

export default async function NepaliPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wpId = Number(id);
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
    author: { email: `WP Author (${wpPost.author})`, role: 'EDITOR' },
    featuredImage: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
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

  const wpRelatedResponse = await getWordPressPosts({
    categories: wpPost.categories,
    status: 'publish',
    lang: 'ne',
    perPage: 5,
    embed: true
  });

  const relatedPosts = wpRelatedResponse.data
    .filter(p => p.id !== wpPost.id)
    .slice(0, 4)
    .map(p => ({
      id: String(p.id),
      title: p.title.rendered,
      type: mapCategoryToType(p.categories, 'ne'),
      createdAt: new Date(p.date),
      featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      url: `/nepali/post/${p.id}`
    }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20 pt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">

        <article className="lg:col-span-2">

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

        {post.featuredImage && (
          <div className="w-full mb-10 overflow-hidden rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.featuredImage} alt={post.title} className="w-full aspect-video object-cover" />
          </div>
        )}

        {/* Post Content */}
        <div
          className="prose prose-lg sm:prose-xl prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-navy dark:prose-headings:text-white prose-a:text-accent dark:prose-a:text-accent font-nepali prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        </article>

        <aside className="lg:col-span-1 space-y-8 font-nepali mt-10 lg:mt-0">
          {relatedPosts.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
              <h3 className="text-xl font-bold text-navy dark:text-white mb-6 border-b border-black/10 dark:border-white/10 pb-4">
                थप {getTypeLabel(post.type)}
              </h3>
              <div className="space-y-4">
                {relatedPosts.map(rp => (
                  <Link key={rp.id} href={rp.url} className="group block flex flex-col gap-3 p-4 -mx-4 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-accent">
                    {rp.featuredImage && (
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-black/5 dark:border-white/10 bg-slate-100 dark:bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rp.featuredImage}
                          alt={rp.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-red-600 tracking-wider">{getTypeLabel(rp.type)}</span>
                        <span className="text-[10px] text-text-muted">&bull;</span>
                        <span className="text-[10px] text-text-muted font-medium">{formatBSDate(rp.createdAt)}</span>
                      </div>
                      <h4 className="font-bold text-navy dark:text-white group-hover:text-accent transition-colors leading-snug">
                        {rp.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
