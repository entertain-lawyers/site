import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Sparkles, ArrowRight, GraduationCap, Search, SearchX } from 'lucide-react';
import { runSearch } from '@/lib/search-core';
import { hitIcon, hitChip } from '@/components/search/search-results';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Results',
  description: 'Search across law notes, case laws, blogs, news, historical facts, publications and events.',
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  const ip = getClientIp(await headers());
  const result = q.length >= 2 ? await runSearch(q, ip) : null;

  return (
    <div className="flex-grow flex flex-col w-full bg-background">
      <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Query header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy dark:text-gray-100 tracking-tight">
            Search Results
          </h1>
          {result && (
            <p className="text-sm text-text-muted dark:text-gray-400 mt-1 font-medium">
              <span className="font-semibold text-text-secondary dark:text-gray-300">“{result.query}”</span>
              {' '}— {result.total} match{result.total === 1 ? '' : 'es'}
              {result.aiUsed && (
                <span className="inline-flex items-center gap-1 ml-2 align-middle rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  AI-powered
                </span>
              )}
            </p>
          )}
        </div>

        {/* No query yet */}
        {!result && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-60" />
            <p className="text-base font-bold text-text-primary">Search the site</p>
            <p className="text-sm text-text-muted mt-1">
              Law notes, case laws, old questions, blogs, news, historical facts, publications &amp; events.
            </p>
          </div>
        )}

        {/* No matches */}
        {result && result.total === 0 && (
          <div className="py-16 text-center">
            <SearchX className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-base font-bold text-text-primary">No matches for “{result.query}”</p>
            <p className="text-sm text-text-muted mt-1.5 max-w-md mx-auto leading-relaxed">
              Try another spelling (roman or Devanagari), or browse the study materials directly.
            </p>
            <Link
              href="/study"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy dark:bg-accent text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              Browse Study Materials
            </Link>
          </div>
        )}

        {/* Results */}
        {result && result.total > 0 && (
          <div className="space-y-6">
            {result.groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-2 pb-2 border-b border-border/60 dark:border-white/10">
                  <GraduationCap className="w-3.5 h-3.5 text-accent" />
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-text-muted">
                    {group.label}
                  </h2>
                  <span className="text-[11px] font-semibold text-text-muted/70">
                    ({group.items.length})
                  </span>
                </div>
                <div className="mt-1">
                  {group.items.map((hit) => {
                    const Icon = hitIcon(hit.category);
                    return (
                      <Link
                        key={hit.id}
                        href={hit.url}
                        className="group w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left transition-colors hover:bg-surface-alt dark:hover:bg-white/5"
                      >
                        <span className={`p-2.5 rounded-xl shrink-0 ${hitChip(hit.category)}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                            {hit.title}
                          </span>
                          {hit.snippet ? (
                            <span className="block text-xs text-text-muted line-clamp-2">{hit.snippet}</span>
                          ) : hit.meta ? (
                            <span className="block text-xs text-text-muted truncate">{hit.meta}</span>
                          ) : null}
                        </span>
                        <ArrowRight className="w-4 h-4 text-text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
