import { auth } from '@/lib/auth';
import { getWordPressPosts, mapCategoryToType } from '@/lib/wordpress';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeletePostButton from './DeletePostButton';

export default async function AdminPostsPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  // Fetch from both WordPress instances
  const [enRes, neRes] = await Promise.all([
    getWordPressPosts({ lang: 'en', perPage: 50 }).catch(() => ({ data: [] })),
    getWordPressPosts({ lang: 'ne', perPage: 50 }).catch(() => ({ data: [] }))
  ]);

  const mapPost = (p: any, lang: 'en' | 'ne') => ({
    id: String(p.id),
    title: p.title.rendered,
    type: mapCategoryToType(p.categories, lang),
    status: p.status === 'publish' ? 'PUBLISHED' : 'DRAFT',
    author: { email: `WP Author (${p.author})` },
    createdAt: new Date(p.date),
  });

  const posts = [
    ...enRes.data.map(p => mapPost(p, 'en')),
    ...neRes.data.map(p => mapPost(p, 'ne'))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">News, Blogs & Facts</h1>
          <p className="mt-2 text-text-secondary font-medium">Manage platform articles and knowledge base.</p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/admin/posts/new"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 hover:-translate-y-0.5"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Post
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <tr>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Type</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Author</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Date</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-navy dark:text-white min-w-[300px]" dangerouslySetInnerHTML={{ __html: post.title }}>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${post.type === 'NEWS' ? 'bg-blue-500' : post.type.includes('NEPALI') ? 'bg-red-500' : post.type === 'BLOG' ? 'bg-purple-500' : 'bg-orange-500'}`}></span>
                      {post.type.replace('NEPALI_', 'NEPALI: ').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${
                      post.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                      {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    {(post.author?.email) || 'Unknown'}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    {post.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    { (session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR') && (
                      <Link href={`/admin/posts/${post.id}/edit?lang=${post.type.startsWith('NEPALI_') ? 'ne' : 'en'}`} className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm">
                        Edit
                      </Link>
                    )}
                    { (session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR') && (
                      <DeletePostButton id={post.id} type={post.type} />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-navy dark:text-white">No posts found</h3>
                    <p className="text-sm text-text-secondary">Get started by creating a new article.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
