import SocialShareToolbar from './SocialShareToolbar';
import LatestPostsSidebar from './LatestPostsSidebar';
import BrandSearchHeader from './BrandSearchHeader';
import Link from 'next/link';
import type { LatestPost } from './LatestPostsSidebar';
import { extractFirstImage } from '@/lib/media/extract-first-image';

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  author: { email: string; name?: string };
}

export interface RelatedPost {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  url: string;
}

const AUTHOR_BIO =
  'Entertain Lawyers is Nepal\u2019s trusted legal news platform, dedicated to delivering unbiased legal updates, court news, and informative content for legal professionals and the general public.';

export default function PostDetail({ post, backUrl, backLabel, relatedPosts = [], latestPosts = [] }: { post: Post, backUrl: string, backLabel: string, relatedPosts?: RelatedPost[], latestPosts?: LatestPost[] }) {
  const featuredImage = post.featuredImage || extractFirstImage(post.content);
  const authorName = post.author.name?.trim() || 'Entertain Lawyers';
  const authorInitial = authorName.charAt(0).toUpperCase();

  const formatLongDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Persistent branding + search (shared site header block) */}
        <BrandSearchHeader />

        <div className="pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 items-start">
          <div className="min-w-0">
            <article>
              {/* Header: back link, category, headline, byline, share */}
              <header className="pb-8">
                <Link
                  href={backUrl}
                  className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  <span aria-hidden="true">&larr;</span> Back to {backLabel}
                </Link>

                <div className="flex flex-wrap items-center gap-3 mt-5 mb-5">
                  <span className="bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                    {post.type}
                  </span>
                  <time
                    dateTime={post.createdAt.toISOString()}
                    className="text-sm font-medium text-text-muted"
                  >
                    {formatLongDate(post.createdAt)}
                  </time>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-navy dark:text-white leading-[1.15] tracking-tight mb-8">
                  {post.title}
                </h1>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 shrink-0 bg-navy rounded-full flex items-center justify-center text-white font-bold text-base"
                      aria-hidden="true"
                    >
                      {authorInitial}
                    </div>
                    <div>
                      <p className="font-bold text-navy dark:text-white leading-tight">{authorName}</p>
                      <p className="text-sm text-text-muted">Entertain Lawyers Editor</p>
                    </div>
                  </div>

                  <div className="sm:justify-self-end">
                    <SocialShareToolbar title={post.title} orientation="horizontal" />
                  </div>
                </div>
              </header>

              {/* Prominent featured image */}
              {featuredImage && (
                <figure className="mb-10 sm:mb-12">
                  <div className="rounded-2xl overflow-hidden shadow-soft-lg border border-border bg-surface-alt">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImage}
                      alt={post.title}
                      className="w-full aspect-video object-cover"
                      loading="eager"
                    />
                  </div>
                </figure>
              )}

              {/* Article body — comfortable editorial reading */}
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* End-of-article share */}
              <div className="mt-12 pt-8 border-t border-border">
                <h2 className="text-sm font-black text-text-muted uppercase tracking-widest mb-4">
                  Share this article
                </h2>
                <SocialShareToolbar title={post.title} orientation="horizontal" />
              </div>

              {/* About the author */}
              <section
                aria-labelledby="about-author-heading"
                className="mt-12 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft"
              >
                <h2
                  id="about-author-heading"
                  className="text-xs font-black text-text-muted uppercase tracking-widest mb-4"
                >
                  About the author
                </h2>
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 shrink-0 bg-navy rounded-full flex items-center justify-center text-white font-bold text-xl"
                    aria-hidden="true"
                  >
                    {authorInitial}
                  </div>
                  <div>
                    <p className="font-bold text-navy dark:text-white mb-1">{authorName}</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{AUTHOR_BIO}</p>
                  </div>
                </div>
              </section>

              {/* Related articles */}
              {relatedPosts.length > 0 && (
                <section aria-labelledby="related-heading" className="mt-14 sm:mt-16">
                  <h2
                    id="related-heading"
                    className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-tight mb-6 pb-3 border-b-2 border-border-strong"
                  >
                    Related {backLabel}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {relatedPosts.map(rp => (
                      <Link
                        key={rp.id}
                        href={rp.url}
                        className="group flex flex-col bg-surface border border-border rounded-2xl overflow-hidden shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="w-full aspect-[16/9] bg-surface-alt border-b border-border overflow-hidden">
                          {rp.featuredImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={rp.featuredImage}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                className="w-10 h-10 text-black/10 dark:text-white/10"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                            <span className="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest">
                              {rp.type}
                            </span>
                            <span className="text-text-muted" aria-hidden="true">&bull;</span>
                            <time
                              dateTime={rp.createdAt.toISOString()}
                              className="text-text-muted font-medium"
                            >
                              {formatShortDate(rp.createdAt)}
                            </time>
                          </div>
                          <h3 className="font-bold text-navy dark:text-white leading-snug line-clamp-3 group-hover:text-accent transition-colors">
                            {rp.title}
                          </h3>
                          <span className="mt-auto pt-3 text-accent font-bold text-xs uppercase tracking-wider">
                            Read more &rarr;
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* End-of-article back navigation */}
              <div className="mt-14 text-center">
                <Link
                  href={backUrl}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-8 rounded-full bg-surface border border-border text-navy dark:text-white font-bold hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span aria-hidden="true">&larr;</span> Back to {backLabel}
                </Link>
              </div>
            </article>
          </div>

          {/* Right sidebar: latest posts — sticky on desktop, below article on mobile (DOM order) */}
          <aside
            className="lg:mt-4 lg:sticky lg:top-20 lg:self-start h-fit mt-0"
            aria-label="Latest posts"
          >
            <LatestPostsSidebar posts={latestPosts} currentPostId={post.id} />
          </aside>
        </div>
      </div>
    </div>
  );
}
