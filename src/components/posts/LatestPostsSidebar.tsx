import Link from 'next/link';
import { User } from 'lucide-react';

export interface LatestPost {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  url: string;
}

/**
 * Compact "Latest Post" rail for article detail pages.
 * Desktop: sticky right-hand column. Mobile: below the article.
 */
export default function LatestPostsSidebar({
  posts,
  currentPostId,
  max = 6,
}: {
  posts: LatestPost[];
  currentPostId?: string;
  max?: number;
}) {
  const items = posts.filter((p) => p.id !== currentPostId).slice(0, max);

  if (items.length === 0) return null;

  return (
    <nav aria-labelledby="latest-posts-heading" className="border border-border bg-surface">
      <div className="bg-navy px-4 py-2.5 dark:bg-navy-light">
        <h2
          id="latest-posts-heading"
          className="text-[13px] font-bold uppercase tracking-[0.14em] text-white"
        >
          Latest Post
        </h2>
      </div>

      <ul className="divide-y divide-border">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={p.url}
              className="group flex items-start gap-3 p-3 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
            >
              <div className="h-16 w-[92px] shrink-0 overflow-hidden border border-border bg-surface-alt">
                {p.featuredImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.featuredImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-5 w-5 text-black/10 dark:text-white/10" aria-hidden="true" />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-bold leading-snug text-navy transition-colors group-hover:text-gold dark:text-white">
                {p.title}
              </h3>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
