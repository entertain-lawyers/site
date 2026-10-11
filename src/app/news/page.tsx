import { getWordPressPosts } from '@/lib/wordpress';
import Link from 'next/link';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const HomeSearchBar = dynamic(() => import('@/components/home/HomeSearchBar'), {
  loading: () => <div className="h-12 w-full bg-surface-alt animate-pulse rounded-full"></div>
});
export const revalidate = 60;

export default async function NewsPage() {
  const wpRes = await getWordPressPosts({ categories: [58], status: 'publish', lang: 'en', perPage: 20, embed: true });
  const posts = wpRes.data.map(p => ({
    id: String(p.id),
    title: p.title.rendered,
    type: 'NEWS',
    content: p.content.rendered,
    createdAt: new Date(p.date),
    featuredImage: (p as any)._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
  }));

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Restored Hero Logo & Search */}
        <section className="pt-2 pb-4 sm:pt-3 sm:pb-6 flex flex-col items-center justify-center text-center relative z-10">
          <div className="relative w-full max-w-[280px] sm:max-w-[480px] md:max-w-[600px] h-24 sm:h-32 md:h-36 mb-0 drop-shadow-sm">
            <Image
              src="/wordmark_navy.png"
              alt="Entertain Lawyers - Connecting with Legal Updates"
              fill
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/wordmark_white.png"
              alt="Entertain Lawyers - Connecting with Legal Updates"
              fill
              className="object-contain hidden dark:block"
              priority
            />
          </div>
        </section>

        <div className="w-full max-w-3xl mx-auto px-6 mb-6 sm:mb-8 relative z-10">
          <hr className="border-t-2 border-border-strong dark:border-white/20" />
        </div>

        <section className="max-w-7xl mx-auto mb-12 sm:mb-16 relative z-10">
          <div className="w-full max-w-3xl mx-auto relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-full blur opacity-70"></div>
            <HomeSearchBar />
          </div>
        </section>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Latest News
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Stay up to date with the latest news and announcements from Entertain Lawyers and the legal world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => {
            const thumbnail = post.featuredImage || extractFirstImage(post.content);
            return (
            <div key={post.id} className="group relative bg-surface border border-border rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
              <div className="w-full h-48 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border-b border-border overflow-hidden">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnail} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-black/10 dark:text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="p-6 sm:p-8 flex flex-col flex-1 bg-white dark:bg-zinc-900">
                <div className="flex-1">
                  <div className="text-xs text-red-600 dark:text-red-400 mb-3 font-bold uppercase tracking-wider">
                    {post.type}
                  </div>
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-4 line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                    <Link href={`/news/${post.id}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true"></span>
                      {post.title}
                    </Link>
                  </h3>
                </div>
                <div className="mt-6">
                  <span className="text-accent font-bold text-sm uppercase tracking-wider group-hover:text-accent-dark transition-colors flex items-center">
                    READ MORE &raquo;
                  </span>
                </div>
              </div>
            </div>
            );
          })}

          {posts.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-navy dark:text-white mb-2">No news found</h3>
              <p className="text-text-secondary">Check back later for news updates.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
