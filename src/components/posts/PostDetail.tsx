import Link from 'next/link';
import Image from 'next/image';
import { Clock, User } from 'lucide-react';
import SocialShareToolbar from './SocialShareToolbar';
import LatestPostsSidebar from './LatestPostsSidebar';
import BrandSearchHeader from './BrandSearchHeader';
import Comments from './Comments';
import { articleFont } from './article-font';
import type { LatestPost } from './LatestPostsSidebar';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import { sanitizeHtml } from '@/lib/sanitize';
import AuthorBioTrigger from '@/components/author/AuthorBioTrigger';

export interface PostAuthor {
  email: string;
  name?: string;
  image?: string | null;
  bio?: string | null;
  website?: string | null;
  role?: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  author: PostAuthor;
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
    <div className="bg-navy dark:bg-zinc-900 dark:border dark:border-white/10 px-4 py-2.5">
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
  showComments = true,
}: {
  post: Post;
  backUrl: string;
  backLabel: string;
  relatedPosts?: RelatedPost[];
  latestPosts?: LatestPost[];
  /** Preview of unsaved drafts passes false — no real post id to thread on. */
  showComments?: boolean;
}) {
  const featuredImage = post.featuredImage || extractFirstImage(post.content);
  const authorName = post.author.name?.trim() || 'Entertain Lawyers';

  const formatLongDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Rough reading-time estimate from the rendered article text.
  const wordCount = post.content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="min-h-screen bg-background pb-14">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        {/* Masthead: brand + search */}
        <BrandSearchHeader />

        <div className="grid grid-cols-1 items-start gap-8 pt-6 lg:grid-cols-[minmax(0,860px)_340px] lg:justify-center lg:gap-12">
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
                <AuthorBioTrigger author={post.author} size="sm" showName />
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.createdAt.toISOString()}>{formatLongDate(post.createdAt)}</time>
                </span>
                <span className="inline-flex items-center gap-1.5" title={`About ${readingMinutes} min read`}>
                  <span className="h-1 w-1 rounded-full bg-text-muted" aria-hidden="true" />
                  {readingMinutes} min read
                </span>
              </div>
            </header>

            {/* Hero image */}
            {featuredImage && (
              <figure className="relative aspect-[16/9] w-full overflow-hidden border border-border bg-surface-alt">
                <Image
                  src={featuredImage}
                  alt={post.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
                  className="object-cover"
                />
              </figure>
            )}

            {/* Share bar — icon + label on every button so it reads clearly */}
            <div id="share" className="mt-3 border border-border bg-surface p-3 sm:p-4">
              <SocialShareToolbar title={post.title} labels />
            </div>

            {/* Article body — old-site reading face (Roboto), justified so
                both edges line up, centred column for balanced margins */}
            <div
              className={`article-body article-body--reading mt-7 ${articleFont.variable}`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />

            {/* About Author */}
            <section aria-labelledby="about-author-heading" className="mt-8 border border-border bg-surface">
              <SectionBar id="about-author-heading">About Author</SectionBar>
              <div className="flex items-start gap-4 p-5">
                <AuthorBioTrigger author={post.author} size="lg" showName={false} />
                <div className="min-w-0">
                  <AuthorBioTrigger
                    author={post.author}
                    showName
                    nameClassName="text-base text-navy dark:text-white hover:text-gold"
                  >
                    <span className="font-bold text-navy dark:text-white text-base hover:text-gold transition-colors cursor-pointer">
                      {authorName}
                    </span>
                  </AuthorBioTrigger>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {post.author.bio || AUTHOR_BIO}
                  </p>
                  {post.author.website && (
                    <a
                      href={post.author.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center text-xs font-semibold text-gold hover:underline"
                    >
                      {post.author.website.replace(/^https?:\/\//, '')} &rarr;
                    </a>
                  )}
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
                        <div className="relative h-[72px] w-[120px] shrink-0 overflow-hidden border border-border bg-surface-alt sm:h-[88px] sm:w-[150px]">
                          {rp.featuredImage ? (
                            <Image
                              src={rp.featuredImage}
                              alt=""
                              fill
                              sizes="150px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
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

          {/* Comments sit at the very bottom, aligned with the article column */}
          {showComments && (
            <div className="mt-2 lg:col-start-1 lg:mt-4">
              <Comments postId={post.id} postType={post.type === 'BLOG' ? 'BLOG' : 'NEWS'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
