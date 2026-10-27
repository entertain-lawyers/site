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
 * "Latest Post" rail for article detail pages — a faithful port of the
 * previous (WordPress/Elementor) site's sidebar widget:
 *
 * - Solid navy header bar (#153158) with white semibold "Latest Post" title.
 * - Stacked, bordered item boxes (1px border, 10px padding) separated by a
 *   15px row gap (10px on mobile).
 * - Thumbnail on the LEFT: 35% of the row width, 2:1 aspect ratio, 10px gap
 *   to the text.
 * - Title only — black Roboto-style semibold, no badge, no date.
 *
 * Desktop: sticky right-hand column. Mobile: stacked below the article.
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
    <nav aria-labelledby="latest-posts-heading">
      {/* Widget heading — navy bar, white semibold title */}
      <div className="mx-[3px] bg-navy dark:bg-navy-light px-[15px] pt-[15px] pb-[10px]">
        <h2
          id="latest-posts-heading"
          className="text-[20px] lg:text-[25px] font-semibold leading-tight text-white"
        >
          Latest Post
        </h2>
      </div>

      {/* Bordered item boxes with 15px (10px mobile) row gaps — thumbnail left, title right */}
      <ul className="mx-[3px] sm:mx-[4px] mt-[15px] space-y-[10px] sm:space-y-[15px]">
        {items.map((p) => (
          <li key={p.id}>
            <article className="group border border-border bg-surface p-[10px] transition-colors duration-200 hover:border-border-strong dark:hover:border-border-strong">
              <Link
                href={p.url}
                className="flex flex-row items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
              >
                {/* Thumbnail — 35% width, 2:1 ratio, 10px gap to text */}
                <div className="w-[35%] shrink-0 mr-[10px]">
                  <div className="relative pb-[50%] overflow-hidden bg-surface-alt">
                    {p.featuredImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.featuredImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 motion-safe:group-hover:scale-[1.04]"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-light" />
                    )}
                  </div>
                </div>

                {/* Title only — previous site showed no badge or date */}
                <h3
                  className="flex-1 min-w-0 line-clamp-3 text-[17px] sm:text-[18px] lg:text-[20px] font-semibold leading-[1.4] text-[#000] transition-colors duration-200 group-hover:text-[#575760] dark:text-white dark:group-hover:text-white/80"
                  style={{ fontFamily: "'Roboto', var(--font-mukta), Tahoma, sans-serif" }}
                >
                  {p.title}
                </h3>
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </nav>
  );
}