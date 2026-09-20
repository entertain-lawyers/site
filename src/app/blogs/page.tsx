import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const revalidate = 60; // Revalidate every minute

export default async function BlogsPage() {
  const posts = await prisma.post.findMany({
    where: { type: 'BLOG', isPublished: true },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { email: true } } }
  });

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Latest Blogs & Articles
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Read insightful opinions, analyses, and guides related to Nepalese law and legal education.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <div key={post.id} className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="p-6 sm:p-8 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center text-xs text-text-muted mb-4 gap-4 uppercase font-bold tracking-wider">
                    <span>{post.createdAt.toLocaleDateString()}</span>
                    <span>{post.author.email.split('@')[0]}</span>
                  </div>
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-4 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-text-secondary line-clamp-3 mb-6">
                    {post.content.substring(0, 150)}...
                  </p>
                </div>
                <div className="mt-auto pt-6 border-t border-border">
                  <Link href={`/blogs/${post.id}`} className="text-accent font-bold text-sm uppercase tracking-wide hover:text-accent-hover transition-colors flex items-center gap-2">
                    Read Article &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {posts.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-navy dark:text-white mb-2">No blogs found</h3>
              <p className="text-text-secondary">Check back later for new articles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
