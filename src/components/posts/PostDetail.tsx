import Link from 'next/link';
import { Clock, User } from 'lucide-react';
import SocialShareToolbar from './SocialShareToolbar';
import LatestPostsSidebar from './LatestPostsSidebar';
import BrandSearchHeader from './BrandSearchHeader';
import ArticleReactions from './ArticleReactions';
import Comments from './Comments';
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

/** Navy section bar used by About Author / Related Post / Latest Post. */
function SectionBar({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy dark:bg-navy-light px-4 py-2.5">
      <h2 id={id} className="text-[13px] font-bold uppercase tracking-[0.14em] text-white">
        {children}
      </h2>
    </div>
  );
}

export default function PostDetail({
  post,
  backUrl,
  backLabel,
  relatedPosts = [],
  latestPosts = [],
}: {
  post: Post;
  backUrl: string;
  backLabel: string;
  relatedPosts?: RelatedPost[];
  latestPosts?: LatestPost[];
}) {
  const featuredImage = post.featuredImage || extractFirstImage(post.content);
  const authorName = post.author.name?.trim() || 'Entertain Lawyers';
  const authorInitial = authorName.charAt(0).toUpperCase();

  const formatLongDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background pb-14">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {/* Masthead: brand + search */}
        <BrandSearchHeader />

        <div className="grid grid-cols-1 items-start gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <article className="min-w-0">
            <Link
              href={backUrl}
              className="inline-flex min-h-[44px] items-center gap-2 rounded text-sm font-semibold text-text-muted transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span aria-hidden="true">&larr;</span> Back to {backLabel}
            </Link>

            <header className="pt-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                {post.type}
              </p>

              <h1 className="mt-2 text-[clamp(1.75rem,3.4vw,2.6rem)] font-black leading-[1.15] tracking-tight text-navy dark:text-white">
                {post.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 pb-5 text-sm text-text-muted">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {authorInitial}
                  </span>
                  <span className="font-semibold text-navy dark:text-white">{authorName}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.createdAt.toISOString()}>{formatLongDate(post.createdAt)}</time>
                </span>
              </div>
            </header>

            {/* Hero image */}
            {featuredImage && (
              <figure className="border border-border bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredImage}
                  alt={post.title}
                  className="aspect-[16/9] w-full object-cover"
                  loading="eager"
                />
              </figure>
            )}

            {/* Share bar — icon + label on every button so it reads clearly */}
            <div id="share" className="mt-3 border border-border bg-surface p-3 sm:p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
                Share this story
              </p>
              <SocialShareToolbar title={post.title} labels />
            </div>

            {/* Article body — serif reading column */}
            <div
              className="article-body mt-7 font-serif"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <ArticleReactions articleId={post.id} />

            {/* About Author */}
            <section aria-labelledby="about-author-heading" className="mt-8 border border-border bg-surface">
              <SectionBar id="about-author-heading">About Author</SectionBar>
              <div className="flex items-start gap-4 p-5">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-gold/40 bg-navy text-xl font-bold text-white"
                  aria-hidden="true"
                >
                  {authorInitial}
                </div>
                <div>
                  <p className="font-bold text-navy dark:text-white">{authorName}</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{AUTHOR_BIO}</p>
                </div>
              </div>
            </section>

            {/* Related Post */}
            {relatedPosts.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-8">
                <SectionBar id="related-heading">Related Post</SectionBar>
                <ul className="divide-y divide-border border border-t-0 border-border bg-surface">
                  {relatedPosts.map((rp) => (
                    <li key={rp.id}>
                      <Link
                        href={rp.url}
                        className="group flex items-start gap-4 p-3 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                      >
                        <div className="h-[72px] w-[120px] shrink-0 overflow-hidden border border-border bg-surface-alt sm:h-[88px] sm:w-[150px]">
                          {rp.featuredImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={rp.featuredImage}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-6 w-6 text-black/10 dark:text-white/10" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-snug text-navy transition-colors group-hover:text-gold dark:text-white sm:text-[15px]">
                            {rp.title}
                          </h3>
                          <time
                            dateTime={rp.createdAt.toISOString()}
                            className="mt-1.5 block text-xs font-medium text-text-muted"
                          >
                            {formatShortDate(rp.createdAt)}
                          </time>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Comments — sign-in required to post */}
            <Comments postId={post.id} postType={post.type === 'BLOG' ? 'BLOG' : 'NEWS'} />

            <div className="mt-10 text-center">
              <Link
                href={backUrl}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 border border-border bg-surface px-7 text-sm font-bold text-navy transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-white"
              >
                <span aria-hidden="true">&larr;</span> Back to {backLabel}
              </Link>
            </div>
          </article>

          {/* Latest Post rail */}
          <aside className="h-fit lg:sticky lg:top-24" aria-label="Latest posts">
            <LatestPostsSidebar posts={latestPosts} currentPostId={post.id} />
          </aside>
        </div>
      </div>
    </div>
  );
}
