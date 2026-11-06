import { getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatBSDate } from '@/lib/nepali-date';
import { sanitizeHtml } from '@/lib/sanitize';
import { Metadata } from 'next';
import { postMetadata } from '@/lib/seo';
import { resolvePostAuthorForDisplay } from '@/lib/post-author';
import { getPublishedNepaliPost } from './validate';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const wpPost = await getPublishedNepaliPost(id);
  if (!wpPost) notFound();
  const wpId = wpPost.id;

  return postMetadata({
    title: `${wpPost.title.rendered} - नेपाली`,
    excerpt: wpPost.excerpt?.rendered,
    content: wpPost.content?.rendered,
    canonical: `/nepali/post/${wpId}`,
    image: wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url,
    publishedTime: wpPost.date,
    modifiedTime: wpPost.modified,
    fallbackDescription: 'Entertain Lawyers मा पूरा लेख पढ्नुहोस्।',
  });
}

export default async function NepaliPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wpPost = await getPublishedNepaliPost(id);
  if (!wpPost) notFound();

  const mappedType = mapCategoryToType(wpPost.categories, 'ne');
  if (!mappedType.startsWith('NEPALI_')) {
    notFound();
  }

  const resolvedAuthor = await resolvePostAuthorForDisplay({ wpPost, lang: 'ne' });

  const post = {
    id: String(wpPost.id),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    type: mappedType,
    createdAt: new Date(wpPost.date),
    author: {
      name: resolvedAuthor.name,
      email: resolvedAuthor.email || '',
      image: resolvedAuthor.image,
      bio: resolvedAuthor.bio,
      website: resolvedAuthor.website,
      role: resolvedAuthor.role || 'EDITOR',
      initials: resolvedAuthor.initials,
    },
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
    embed: true,
    fields: 'id,date,title,categories,_links,_embedded',
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
            {post.author.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.author.image}
                alt={post.author.name}
                className="w-12 h-12 rounded-full object-cover border border-accent/30 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-navy dark:text-white shrink-0">
                {post.author.initials || post.author.name.charAt(0) || 'EL'}
              </div>
            )}
            <div>
              <p className="font-bold text-navy dark:text-white text-lg">
                {post.author.website ? (
                  <a
                    href={post.author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    {post.author.name}
                  </a>
                ) : (
                  post.author.name
                )}
              </p>
              <p className="text-sm text-text-secondary font-nepali">
                {post.author.role === 'ADMIN' ? 'प्रशासक' : 'सम्पादक'}
              </p>
            </div>
          </div>
        </header>

        {post.featuredImage && (
          <div className="w-full mb-10 overflow-hidden rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.featuredImage} alt={post.title} className="w-full aspect-video object-cover" loading="eager" fetchPriority="high" decoding="async" />
          </div>
        )}

        {/* Post Content */}
        <div
          className="prose prose-lg sm:prose-xl prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-navy dark:prose-headings:text-white prose-a:text-accent dark:prose-a:text-accent font-nepali prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
        />

        {/* About Author */}
        <section aria-labelledby="nepali-author-heading" className="mt-12 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5">
          <h2 id="nepali-author-heading" className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4 font-nepali">
            लेखकको बारेमा
          </h2>
          <div className="flex items-start gap-4">
            {post.author.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.author.image}
                alt={post.author.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-accent/30 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold text-navy dark:text-white shrink-0">
                {post.author.initials || post.author.name.charAt(0) || 'EL'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-navy dark:text-white text-lg font-nepali">
                {post.author.website ? (
                  <a
                    href={post.author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    {post.author.name}
                  </a>
                ) : (
                  post.author.name
                )}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary font-nepali">
                {post.author.bio}
              </p>
              {post.author.website && (
                <a
                  href={post.author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-xs font-semibold text-accent hover:underline font-nepali"
                >
                  {post.author.website.replace(/^https?:\/\//, '')} &rarr;
                </a>
              )}
            </div>
          </div>
        </section>
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
