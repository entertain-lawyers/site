import Link from 'next/link';

export interface LatestPost {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  url: string;
}

/**
 * Compact "Latest Posts" rail for article detail pages.
 * Desktop: rendered inside a sticky right-hand column.
 * Mobile: rendered below the article by the page layout.
 */
export default function LatestPostsSidebar({ posts, currentPostId, max = 6 }: { posts: LatestPost[], currentPostId?: string, max?: number }) {
  const items = posts
    .filter(p => p.id !== currentPostId)
    .slice(0, max);

  if (items.length === 0) return null;

  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <nav
      aria-labelledby="latest-posts-heading"
      className="bg-surface border border-border rounded-2xl p-5 shadow-soft"
    >
      <h2
        id="latest-posts-heading"
        className="text-xs font-black text-text-muted uppercase tracking-widest pb-3 mb-3 border-b border-border"
      >
        Latest Posts
      </h2>
      <ul className="flex flex-col">
        {items.map(p => (
          <li key={p.id}>
            <Link
              href={p.url}
              className="group flex items-start gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="w-24 sm:w-28 shrink-0 aspect-video rounded-lg overflow-hidden bg-surface-alt border border-border">
                {p.featuredImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.featuredImage}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-black/10 dark:text-white/10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-navy dark:text-white leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                  {p.title}
                </h3>
                <time
                  dateTime={p.createdAt.toISOString()}
                  className="mt-1 block text-xs font-medium text-text-muted"
                >
                  {formatShortDate(p.createdAt)}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
