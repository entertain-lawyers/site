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
 * Sidebar widget for Latest Case Laws on desktop & mobile detail views.
 * Replaces the syllabus navigator on prescribed cases and landmark judgments.
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
    <nav aria-labelledby="latest-case-laws-heading" className="w-full">
      {/* Widget heading — solid navy bar matching site branding */}
      <div className="mx-[3px] bg-navy dark:bg-zinc-900 dark:border dark:border-white/10 px-[15px] pt-[15px] pb-[10px] flex items-center justify-between">
        <h2
          id="latest-case-laws-heading"
          className="text-[20px] lg:text-[25px] font-semibold leading-tight text-white flex items-center gap-2"
        >
          <Scale className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
          <span>{title}</span>
        </h2>
      </div>

      {/* Bordered item boxes matching WordPress sidebar design */}
      <ul className="mx-[3px] sm:mx-[4px] mt-[15px] space-y-[10px] sm:space-y-[15px]">
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
              <article className="group border border-border bg-surface p-[10px] transition-colors duration-200 hover:border-border-strong dark:hover:border-border-strong">
                <Link
                  href={`/read/${c.id}`}
                  className="flex flex-row items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                >
                  {/* Thumbnail — 35% width, 2:1 ratio, 10px gap to text */}
                  <div className="w-[35%] shrink-0 mr-[10px]">
                    <div className="relative pb-[50%] overflow-hidden bg-surface-alt rounded-sm">
                      {c.featuredImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={c.featuredImage}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 motion-safe:group-hover:scale-[1.04]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-accent/40 flex items-center justify-center text-white/80">
                          <Scale className="w-5 h-5 opacity-70" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Case Info */}
                  <div className="flex-1 min-w-0">
                    {badgeText && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-accent mb-1 truncate max-w-full">
                        {badgeText}
                      </span>
                    )}
                    <h3
                      className="line-clamp-2 text-[15px] sm:text-[16px] lg:text-[17px] font-semibold leading-[1.35] text-text-primary transition-colors duration-200 group-hover:text-accent dark:group-hover:text-accent-hover"
                      style={{ fontFamily: "'Roboto', var(--font-mukta), Tahoma, sans-serif" }}
                    >
                      {c.title}
                    </h3>
                    {dateFormatted && (
                      <span className="block mt-1 text-[11px] text-text-muted">
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
      <div className="mx-[3px] sm:mx-[4px] mt-3">
        <Link
          href="/study?type=CASE_LAW"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 text-xs font-bold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-md transition-colors text-center"
        >
          <span>Explore All Case Laws</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
