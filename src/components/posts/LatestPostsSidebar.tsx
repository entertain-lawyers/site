import Link from 'next/link';
import { Newspaper } from 'lucide-react';

export interface LatestPost {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  featuredImage?: string | null;
  url: string;
}

interface LatestPostsSidebarProps {
  posts: LatestPost[];
  currentPostId?: string;
  max?: number;
  title?: string;
}

/**
 * Sidebar widget for Latest Posts / News on article & detail pages.
 * Styled to match the modern rounded card layout and design system.
 */
export default function LatestPostsSidebar({
  posts,
  currentPostId,
  max = 6,
  title = 'Latest Posts',
}: LatestPostsSidebarProps) {
  const items = posts.filter((p) => p.id !== currentPostId).slice(0, max);

  if (items.length === 0) return null;

  return (
    <nav
      aria-labelledby="latest-posts-heading"
      className="w-full rounded-2xl border border-border bg-surface p-3.5 sm:p-4 shadow-xs"
    >
      {/* Widget heading */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
        <h2
          id="latest-posts-heading"
          className="text-xs font-bold text-navy dark:text-white uppercase tracking-wider flex items-center gap-2"
        >
          <Newspaper className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
          <span>{title}</span>
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
          Updates
        </span>
      </div>

      {/* Item cards */}
      <ul className="space-y-2.5">
        {items.map((p) => {
          const dateFormatted = p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <li key={p.id}>
              <article className="group rounded-xl border border-border/70 bg-surface-alt/40 p-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-accent/5 hover:shadow-2xs">
                <Link
                  href={p.url}
                  className="flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="w-20 sm:w-22 aspect-4/3 shrink-0 rounded-lg overflow-hidden bg-surface-alt border border-border/50 relative">
                    {p.featuredImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.featuredImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 motion-safe:group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-accent/30 flex items-center justify-center text-white/80">
                        <Newspaper className="w-4 h-4 opacity-75" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Title and date */}
                  <div className="flex-1 min-w-0">
                    <h3 className="line-clamp-2 text-xs sm:text-[13px] font-semibold leading-snug text-navy dark:text-white transition-colors duration-200 group-hover:text-accent dark:group-hover:text-accent-hover">
                      {p.title}
                    </h3>
                    {dateFormatted && (
                      <span className="block mt-1 text-[10px] text-text-muted">
                        {dateFormatted}
                      </span>
                    )}
                  </div>
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}