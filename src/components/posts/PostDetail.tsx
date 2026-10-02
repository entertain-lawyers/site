import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  author: { email: string };
}

export default function PostDetail({ post, backUrl, backLabel }: { post: Post, backUrl: string, backLabel: string }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      {post.featuredImage ? (
        <div className="w-full h-[40vh] md:h-[60vh] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-5xl mx-auto">
             <div className="flex items-center gap-4 mb-4">
                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                  {post.type}
                </span>
                <span className="text-white/80 text-sm font-medium">
                  {post.createdAt.toLocaleDateString()}
                </span>
             </div>
             <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg">
                {post.title}
             </h1>
          </div>
        </div>
      ) : (
        <div className="bg-navy dark:bg-zinc-900 pt-32 pb-20 px-6">
           <div className="max-w-4xl mx-auto text-center">
             <div className="flex items-center justify-center gap-4 mb-6">
                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                  {post.type}
                </span>
                <span className="text-white/80 text-sm font-medium">
                  {post.createdAt.toLocaleDateString()}
                </span>
             </div>
             <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg">
                {post.title}
             </h1>
           </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
        <article className="lg:col-span-3 bg-white dark:bg-zinc-950 p-6 md:p-10 lg:p-12 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4 mb-10 pb-10 border-b border-black/5 dark:border-white/10">
            <div className="w-12 h-12 bg-navy dark:bg-white rounded-full flex items-center justify-center text-white dark:text-navy font-bold text-lg">
              {post.author.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-navy dark:text-white">By {post.author.email.split('@')[0]}</p>
              <p className="text-sm text-text-muted">Entertain Lawyers Editor</p>
            </div>
          </div>

          <div
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-dark prose-img:rounded-xl prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        <aside className="lg:col-span-1 space-y-8">
          <Link href={backUrl} className="block text-center w-full bg-slate-100 dark:bg-zinc-900 text-navy dark:text-white font-bold py-4 rounded-xl border border-black/5 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors">
            &larr; Back to {backLabel}
          </Link>
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
            <h3 className="text-lg font-black text-navy dark:text-white mb-4 uppercase border-b border-black/10 dark:border-white/10 pb-4">About the Author</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              This post was authored by a trusted editor at Entertain Lawyers. We are dedicated to bringing you the most accurate and insightful legal analysis in Nepal.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
