import { getWordPressPosts } from '@/lib/wordpress';
import Link from 'next/link';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import { SubjectCard } from '@/components/study/SubjectCard';
import { Hourglass, Users } from 'lucide-react';

export const revalidate = 60;

export default async function FactsPage() {
  const wpRes = await getWordPressPosts({ categories: [78], status: 'publish', lang: 'en', perPage: 20, embed: true });
  const posts = wpRes.data.map(p => ({
    id: String(p.id),
    title: p.title.rendered,
    type: 'FACT',
    content: p.content.rendered,
    createdAt: new Date(p.date),
    featuredImage: (p as any)._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
  }));

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Historical Facts
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Discover interesting historical facts, events, and trivia about the Nepalese legal system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-16">
          <SubjectCard 
            title="Historical Facts"
            subtitle=""
            href="/historical-facts?category=historical"
            icon={Hourglass}
          />
          <SubjectCard 
            title="Legal Personalities"
            subtitle=""
            href="/historical-facts?category=personalities"
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => {
            const thumbnail = post.featuredImage || extractFirstImage(post.content);
            return (
            <div key={post.id} className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
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
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-4 line-clamp-2 leading-tight">
                    {post.title}
                  </h3>
                </div>
                <div className="mt-6">
                  <Link href={`/historical-facts/${post.id}`} className="text-accent font-bold text-sm uppercase tracking-wider hover:text-accent-dark transition-colors flex items-center">
                    READ MORE &raquo;
                  </Link>
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
              <h3 className="text-xl font-bold text-navy dark:text-white mb-2">No facts found</h3>
              <p className="text-text-secondary">Check back later for interesting historical facts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
