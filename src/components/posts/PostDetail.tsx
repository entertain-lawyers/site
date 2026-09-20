import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: Date;
  author: { email: string };
}

export default function PostDetail({ post, backUrl, backLabel }: { post: Post, backUrl: string, backLabel: string }) {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={backUrl} className="text-accent hover:underline mb-8 inline-block">&larr; Back to {backLabel}</Link>
        
        <article className="bg-surface p-8 sm:p-12 rounded-3xl border border-border shadow-soft">
          <header className="mb-10 text-center">
            <div className="flex items-center justify-center text-xs text-text-muted mb-4 gap-4 uppercase font-bold tracking-wider">
              <span>{post.createdAt.toLocaleDateString()}</span>
              <span>&bull;</span>
              <span>{post.author.email.split('@')[0]}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight leading-tight mb-6">
              {post.title}
            </h1>
          </header>

          <div className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-hover max-w-none">
            {post.content.split('\n').map((paragraph, idx) => (
              paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx} />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
