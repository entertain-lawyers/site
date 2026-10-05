import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatBSDate } from '@/lib/nepali-date';
import { PostType } from '@prisma/client';

const CATEGORY_MAP: Record<string, { type: PostType, title: string, icon: string, description: string }> = {
  'samanya-samachar': { type: 'NEPALI_SAMANYA_SAMACHAR', title: 'सामान्य समाचार', icon: '📰', description: 'दैनिक र सामान्य समाचारहरू' },
  'adalat-samachar': { type: 'NEPALI_ADALAT_SAMACHAR', title: 'अदालत समाचार', icon: '⚖️', description: 'विभिन्न अदालतका महत्वपूर्ण निर्णय तथा समाचार' },
  'mukhya-faisla': { type: 'NEPALI_MUKHYA_SAMACHAR', title: 'मुख्य फैसला', icon: '🔥', description: 'आजका प्रमुख र विशेष समाचारहरू' },
  'najirharu': { type: 'NEPALI_NAJIRHARU', title: 'नजिरहरु', icon: '📚', description: 'सर्वोच्च अदालतका स्थापित नजिरहरू' },
  'ain-kanun': { type: 'NEPALI_AIN_KANUN', title: 'ऐन तथा कानून', icon: '📜', description: 'नेपालका प्रचलित ऐन र कानूनहरू' },
  'blog-bichar': { type: 'NEPALI_BLOG_BICHAR', title: 'ब्लग, बिचार, अन्य', icon: '✍️', description: 'विभिन्न लेखकका लेख, विचार, र अन्य' },
};

export async function generateMetadata({ params }: { params: { category: string } }) {
  const categoryInfo = CATEGORY_MAP[params.category];
  if (!categoryInfo) return { title: 'Not Found' };

  return {
    title: `${categoryInfo.title} - नेपाली | Entertain Lawyers`,
    description: categoryInfo.description,
  };
}

export default async function NepaliCategoryPage({ params }: { params: { category: string } }) {
  const categoryInfo = CATEGORY_MAP[params.category];

  if (!categoryInfo) {
    notFound();
  }

  const posts = await prisma.post.findMany({
    where: {
      type: categoryInfo.type,
      status: 'PUBLISHED',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { email: true } }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20">
      {/* Header */}
      <section className="bg-white dark:bg-zinc-900 border-b border-black/5 dark:border-white/5 pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 dark:bg-accent/20 text-4xl mb-6">
            {categoryInfo.icon}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-navy dark:text-white tracking-tight mb-4 font-nepali">
            {categoryInfo.title}
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-text-secondary font-medium font-nepali">
            {categoryInfo.description}
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <Link href="/nepali" className="inline-flex items-center text-accent dark:text-accent font-bold mb-8 hover:underline font-nepali">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          मुख्य पृष्ठमा फर्कनुहोस्
        </Link>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article key={post.id} className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 flex flex-col h-full">
                <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                  <span className="text-6xl text-black/5 dark:text-white/5 font-serif italic">EL</span>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-3 line-clamp-2 group-hover:text-accent dark:group-hover:text-accent transition-colors font-nepali">
                    <Link href={`/nepali/post/${post.id}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {post.title}
                    </Link>
                  </h3>
                  <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-sm text-text-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-navy dark:text-white">
                        {(post.author?.email)?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium truncate max-w-[120px]">{(post.author?.email) || 'सम्पादक'}</span>
                    </div>
                    <time className="font-medium font-nepali">{formatBSDate(post.createdAt)}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white font-nepali mb-2">कुनै पनि सामग्री भेटिएन</h3>
            <p className="text-text-secondary font-nepali">यस वर्गमा हालसम्म कुनै पनि सामग्री प्रकाशित भएको छैन।</p>
          </div>
        )}
      </section>
    </div>
  );
}
