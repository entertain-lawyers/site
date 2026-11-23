import Link from 'next/link';
import { Scale, ArrowRight } from 'lucide-react';
import { getCaseCategory, getCaseLawCategory, formatCaseLawCategory } from '@/lib/case-category';

export interface LatestCaseLawItem {
  id: string;
  title: string;
  type?: string;
  createdAt?: Date | string;
  featuredImage?: string | null;
  metaTitle?: string | null;
}

interface LatestCaseLawsSidebarProps {
  cases: LatestCaseLawItem[];
  currentResourceId?: string;
  max?: number;
  title?: string;
}

/**
 * Sidebar widget for Latest Case Laws & Precedents on desktop & mobile detail views.
 * Rendered on standalone precedent case laws and articles without a curriculum syllabus.
 */
export default function LatestCaseLawsSidebar({
  cases,
  currentResourceId,
  max = 5,
  title = 'Latest Case Laws',
}: LatestCaseLawsSidebarProps) {
  const items = cases.filter((c) => c.id !== currentResourceId).slice(0, max);

  if (items.length === 0) return null;

  return (
    <nav
      aria-labelledby="latest-case-laws-heading"
      className="w-full rounded-2xl border border-border bg-surface p-3.5 sm:p-4 shadow-xs"
    >
      {/* Widget heading */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
        <h2
          id="latest-case-laws-heading"
          className="text-xs font-bold text-navy dark:text-white uppercase tracking-wider flex items-center gap-2"
        >
          <Scale className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
          <span>{title}</span>
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
          Precedents
        </span>
      </div>

      {/* Item cards */}
      <ul className="space-y-2.5">
        {items.map((c) => {
          const category = getCaseCategory(c);
          const lawCategory = getCaseLawCategory(c);
          const badgeText = lawCategory
            ? formatCaseLawCategory(lawCategory)
            : category === 'NEW_CASE'
            ? 'New Case'
            : category === 'OLD_CASE'
            ? 'Old Case'
            : category === 'BOTH_CASES'
            ? 'Prescribed'
            : c.metaTitle || null;

          const dateFormatted = c.createdAt
            ? new Date(c.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <li key={c.id}>
              <article className="group rounded-xl border border-border/70 bg-surface-alt/40 p-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-accent/5 hover:shadow-2xs">
                <Link
                  href={`/read/${c.id}`}
                  className="flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="w-20 sm:w-22 aspect-4/3 shrink-0 rounded-lg overflow-hidden bg-surface-alt border border-border/50 relative">
                    {c.featuredImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={c.featuredImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 motion-safe:group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-accent/30 flex items-center justify-center text-white/80">
                        <Scale className="w-4 h-4 opacity-75" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Case Info */}
                  <div className="flex-1 min-w-0">
                    {badgeText && (
                      <span className="inline-block text-[9.5px] font-bold uppercase tracking-wider text-accent mb-0.5 truncate max-w-full">
                        {badgeText}
                      </span>
                    )}
                    <h3 className="line-clamp-2 text-xs sm:text-[13px] font-semibold leading-snug text-navy dark:text-white transition-colors duration-200 group-hover:text-accent dark:group-hover:text-accent-hover">
                      {c.title}
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

      {/* Explore All Cases Footer Link */}
      <div className="mt-3 pt-3 border-t border-border/70">
        <Link
          href="/study?type=CASE_LAW"
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-bold text-accent bg-accent/5 hover:bg-accent/15 border border-accent/20 rounded-xl transition-all text-center shadow-2xs hover:shadow-xs"
        >
          <span>Explore All Precedents &amp; Cases</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
