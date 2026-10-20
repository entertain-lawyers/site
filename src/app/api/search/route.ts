import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getWordPressPosts,
  mapCategoryToType,
  decodeHtmlEntities,
  WordPressPost,
  WordPressLanguage,
} from '@/lib/wordpress';
import { searchMatches } from '@/lib/translit-search';

export const dynamic = 'force-dynamic';

interface SearchHit {
  id: string;
  title: string;
  meta?: string;
  url: string;
  /** Display category key used by the UI for icon + chip color. */
  category: string;
}

/** Clean an HTML-enriched WP title into plain text. */
function cleanTitle(raw: string): string {
  return decodeHtmlEntities(raw.replace(/<[^>]*>/g, '')).trim();
}

const WP_LABELS: Record<string, string> = {
  BLOG: 'Blog',
  NEWS: 'News',
  FACT: 'Historical Fact',
  PERSONALITY: 'Personality',
  NEPALI_ADALAT_SAMACHAR: 'Nepali Court News',
  NEPALI_NAJIRHARU: 'Nepali Precedents',
  NEPALI_AIN_KANUN: 'Nepali Laws',
  NEPALI_BLOG_BICHAR: 'Nepali Blog',
  NEPALI_SAMANYA_SAMACHAR: 'Nepali News',
  UNKNOWN: 'Article',
};

function wpUrl(type: string, id: number): string {
  if (type.startsWith('NEPALI')) return `/nepali/post/${id}`;
  if (type === 'BLOG') return `/blogs/${id}`;
  if (type === 'NEWS') return `/news/${id}`;
  if (type === 'FACT' || type === 'PERSONALITY') return `/historical-facts/${id}`;
  return `/blogs/${id}`;
}

/** Search one WP language site: native search first, translit fallback for roman↔Devanagari. */
async function searchWordPress(
  lang: WordPressLanguage,
  q: string,
  limit: number
): Promise<SearchHit[]> {
  const res = await getWordPressPosts({ search: q, status: 'publish', lang, perPage: 12, embed: false });
  let posts: WordPressPost[] = Array.isArray(res?.data) ? res.data : [];

  // Transliteration fallback: "ram" must surface "राम" and vice versa.
  // WP's own search is plain LIKE, so when it finds nothing we match titles locally.
  if (posts.length === 0 && q.trim().length >= 3) {
    try {
      const all = await getWordPressPosts({ status: 'publish', lang, perPage: 100, embed: false });
      posts = (Array.isArray(all?.data) ? all.data : []).filter((p) =>
        searchMatches(cleanTitle(p.title?.rendered ?? ''), q)
      );
    } catch {
      // silent — WP unavailability must not break the search endpoint
    }
  }

  return posts.slice(0, limit).map((p): SearchHit | null => {
    const type = mapCategoryToType(p.categories, lang);
    // Posts outside the app's public taxonomy (e.g. WP-only case documents)
    // would 404 on their detail pages — exclude them from results.
    if (type === 'UNKNOWN') return null;
    return {
      id: `wp-${p.id}`,
      title: cleanTitle(p.title?.rendered ?? ''),
      meta: p.date ? new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined,
      url: wpUrl(type, p.id),
      category: type,
    };
  }).filter((h): h is SearchHit => Boolean(h && h.title));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ query: q, groups: [] });
  }

  const [resources, publications, events, wpEn, wpNe] = await Promise.allSettled([
    // 1. Study materials (Prisma) — translit-matched in memory
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        type: true,
        subject: { select: { name: true } },
      },
      orderBy: [{ subject: { order: 'asc' } }, { title: 'asc' }],
    }),
    // 2. Publications
    prisma.publication.findMany({
      where: { publishDate: { lte: new Date() } },
      select: { id: true, title: true, slug: true },
      orderBy: { publishDate: 'desc' },
      take: 200,
    }),
    // 3. Events
    prisma.event.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { eventDate: 'desc' },
      take: 200,
    }),
    // 4. WordPress (both EN and NP sites)
    searchWordPress('en' as WordPressLanguage, q, 6),
    searchWordPress('ne' as WordPressLanguage, q, 6),
  ]);

  const studyHits: SearchHit[] =
    resources.status === 'fulfilled'
      ? resources.value
          .filter((r) => searchMatches(r.title, q))
          .slice(0, 6)
          .map((r) => ({
            id: r.id,
            title: r.title,
            meta: r.subject?.name ?? undefined,
            url: `/resources/${r.id}`,
            category: `resource-${r.type}`,
          }))
      : [];

  const publicationHits: SearchHit[] =
    publications.status === 'fulfilled'
      ? publications.value
          .filter((p) => searchMatches(p.title, q))
          .slice(0, 4)
          .map((p) => ({
            id: p.id,
            title: p.title,
            url: `/publications/${p.slug}`,
            category: 'publication',
          }))
      : [];

  const eventHits: SearchHit[] =
    events.status === 'fulfilled'
      ? events.value
          .filter((e) => searchMatches(e.title, q))
          .slice(0, 3)
          .map((e) => ({
            id: e.id,
            title: e.title,
            url: `/events/${e.slug}`,
            category: 'event',
          }))
      : [];

  const groups: { label: string; order: number; items: SearchHit[] }[] = [
    ...(studyHits.length ? [{ order: 0, label: 'Study Materials', items: studyHits }] : []),
    ...(wpEn.status === 'fulfilled' && wpEn.value.length
      ? groupWpHits(wpEn.value, 1)
      : []),
    ...(wpNe.status === 'fulfilled' && wpNe.value.length
      ? groupWpHits(wpNe.value, 2)
      : []),
    ...(publicationHits.length ? [{ order: 3, label: 'Publications', items: publicationHits }] : []),
    ...(eventHits.length ? [{ order: 4, label: 'Events', items: eventHits }] : []),
  ];

  groups.sort((a, b) => a.order - b.order);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return NextResponse.json({
    query: q,
    total,
    groups: groups.map(({ label, items }) => ({ label, items })),
  });
}

function groupWpHits(hits: SearchHit[], order: number) {
  const byLabel = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const label = WP_LABELS[hit.category] ?? WP_LABELS.UNKNOWN;
    const list = byLabel.get(label) ?? [];
    list.push(hit);
    byLabel.set(label, list);
  }
  return [...byLabel.entries()].map(([label, items]) => ({ order, label, items }));
}
