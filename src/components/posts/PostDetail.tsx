import SocialShareToolbar from './SocialShareToolbar';
import Link from 'next/link';
import { extractFirstImage } from '@/lib/media/extract-first-image';

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  author: { email: string };
}

export interface RelatedPost {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  url: string;
}

export default function PostDetail({ post, backUrl, backLabel, relatedPosts = [] }: { post: Post, backUrl: string, backLabel: string, relatedPosts?: RelatedPost[] }) {
  const featuredImage = post.featuredImage || extractFirstImage(post.content);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              {post.type}
            </span>
            <span className="text-navy/60 dark:text-white/60 text-sm font-medium">
              {post.createdAt.toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-navy dark:text-white leading-tight">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
        <article className="lg:col-span-2 bg-white dark:bg-zinc-950 p-6 md:p-10 lg:p-12 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-10 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-navy dark:bg-white rounded-full flex items-center justify-center text-white dark:text-navy font-bold text-lg">
                {post.author.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-navy dark:text-white">By {post.author.email.split('@')[0]}</p>
                <p className="text-sm text-text-muted">Entertain Lawyers Editor</p>
              </div>
            </div>

            <SocialShareToolbar title={post.title} orientation="horizontal" />
          </div>

          {featuredImage && (
            <div className="w-full mb-10 overflow-hidden rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featuredImage} alt={post.title} className="w-full aspect-video object-cover" />
            </div>
          )}

          <div
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-dark prose-img:rounded-xl prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/10">
            <h3 className="text-lg font-bold text-navy dark:text-white mb-4">Share this article</h3>
            <SocialShareToolbar title={post.title} orientation="horizontal" />
          </div>
        </article>

        <aside className="lg:col-span-1 space-y-8">
          <Link href={backUrl} className="block text-center w-full bg-slate-100 dark:bg-zinc-900 text-navy dark:text-white font-bold py-4 rounded-xl border border-black/5 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors">
            &larr; Back to {backLabel}
          </Link>

          {relatedPosts.length > 0 && (
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
              <h3 className="text-lg font-black text-navy dark:text-white mb-6 uppercase border-b border-black/10 dark:border-white/10 pb-4">
                Related {backLabel}
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
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{rp.type}</span>
                        <span className="text-[10px] text-text-muted">&bull;</span>
                        <span className="text-[10px] text-text-muted font-medium">{rp.createdAt.toLocaleDateString()}</span>
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
