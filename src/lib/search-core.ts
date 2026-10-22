import { prisma } from '@/lib/prisma';
import {
  getWordPressPosts,
  mapCategoryToType,
  decodeHtmlEntities,
  WordPressPost,
  WordPressLanguage,
} from '@/lib/wordpress';
import { searchMatches } from '@/lib/translit-search';
import { rateLimit } from '@/lib/rate-limit';
import { geminiEmbed, isAiEnabled } from '@/lib/ai/gemini';
import { normalizeSearchQuery } from '@/lib/ai/normalize';
import { searchEmbeddings } from '@/lib/ai/semantic';

/**
 * Core site-wide search, shared by the /api/search endpoint and the
 * /search results page. Heuristic keyword matching across every content
 * source, plus the AI layer (LLM query normalization + semantic embedding
 * matches) which degrades gracefully when no Gemini key is configured.
 */

export interface SearchHit {
  id: string;
  title: string;
  meta?: string;
  url: string;
  category: string;
}

export interface SearchGroup {
  label: string;
  items: SearchHit[];
}

export interface SearchResponse {
  query: string;
  total: number;
  groups: SearchGroup[];
  aiUsed: boolean;
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

function groupWpHits(hits: SearchHit[]) {
  const byLabel = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const label = WP_LABELS[hit.category] ?? WP_LABELS.UNKNOWN;
    const list = byLabel.get(label) ?? [];
    list.push(hit);
    byLabel.set(label, list);
  }
  return [...byLabel.entries()].map(([label, items]) => ({ label, items }));
}

/** Cached embedding for search queries — repeated terms hit the cache. */
const embedCache = new Map<string, number[]>();
const EMBED_CACHE_MAX = 300;

async function embedQueryCached(text: string): Promise<number[] | null> {
  if (!isAiEnabled()) return null;
  const key = text.trim().toLowerCase();
  if (!key) return null;
  const hit = embedCache.get(key);
  if (hit) return hit;
  const vector = await geminiEmbed(key.slice(0, 500));
  if (!vector) return null;
  if (embedCache.size > EMBED_CACHE_MAX) {
    embedCache.delete(embedCache.keys().next().value as string);
  }
  embedCache.set(key, vector);
  return vector;
}

export async function runSearch(q: string, ip: string): Promise<SearchResponse> {
  q = q.trim();
  if (q.length < 2) {
    return { query: q, total: 0, groups: [], aiUsed: false };
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

  // ---- AI layer: LLM query normalization + semantic matching --------------
  // Degrades gracefully — without a Gemini key everything here is a no-op and
  // the response keeps exactly the same shape as before.
  // Fail-open: an unavailable limiter must not take search down with it.
  let aiAllowed = false;
  if (isAiEnabled() && q.length >= 3) {
    try {
      aiAllowed = (await rateLimit(`ai-search:${ip}`, 30, 60)).success;
    } catch {
      aiAllowed = true;
    }
  }

  let extraStudy: SearchHit[] = [];
  let extraPublications: SearchHit[] = [];
  let extraEvents: SearchHit[] = [];
  let extraWp: SearchHit[] = [];
  let semanticDocs: Awaited<ReturnType<typeof searchEmbeddings>> = [];
  let aiUsed = false;

  if (aiAllowed) {
    // 1) LLM query normalization (typo fixes, roman ↔ Devanagari pairs).
    //    QUOTA-SAVING: only spend a GenerateContent request when the plain
    //    search results are weak — strong result sets skip the LLM pass
    //    (the free-tier chat budget is shared with the chatbot).
    const baseTotal =
      studyHits.length + publicationHits.length + eventHits.length +
      (wpEn.status === 'fulfilled' ? wpEn.value.length : 0) +
      (wpNe.status === 'fulfilled' ? wpNe.value.length : 0);
    const keywords = baseTotal < 3 ? await normalizeSearchQuery(q) : null;

    if (keywords?.length) {
      // Broaden the keyword scope: normalized terms feed the same DB/WP
      // passes the raw query ran.
      const [wpEn2, wpNe2] = await Promise.allSettled([
        searchWordPress('en' as WordPressLanguage, keywords[0], 4),
        searchWordPress('ne' as WordPressLanguage, keywords[0], 4),
      ]);
      const matchesExtra = (title: string): boolean =>
        !searchMatches(title, q) && keywords.some((k) => searchMatches(title, k));

      extraStudy = (resources.status === 'fulfilled' ? resources.value : [])
        .filter((r) => matchesExtra(r.title))
        .slice(0, 4)
        .map((r) => ({
          id: `x-${r.id}`,
          title: r.title,
          meta: r.subject?.name ?? undefined,
          url: `/resources/${r.id}`,
          category: `resource-${r.type}`,
        }));

      extraPublications = (publications.status === 'fulfilled' ? publications.value : [])
        .filter((p) => matchesExtra(p.title))
        .slice(0, 3)
        .map((p) => ({
          id: `x-${p.id}`,
          title: p.title,
          url: `/publications/${p.slug}`,
          category: 'publication',
        }));

      extraEvents = (events.status === 'fulfilled' ? events.value : [])
        .filter((e) => matchesExtra(e.title))
        .slice(0, 2)
        .map((e) => ({
          id: `x-${e.id}`,
          title: e.title,
          url: `/events/${e.slug}`,
          category: 'event',
        }));

      extraWp = [
        ...(wpEn2.status === 'fulfilled' ? wpEn2.value : []),
        ...(wpNe2.status === 'fulfilled' ? wpNe2.value : []),
      ];
      aiUsed = true;
    }

    // 2) Semantic pass — runs even when normalization failed (better than
    //    nothing; embeddings are the most reliable part of the AI layer).
    const qvec = await embedQueryCached(keywords?.length ? [q, ...keywords].join(' ') : q);
    if (qvec) {
      semanticDocs = await searchEmbeddings(qvec, { limit: 6, minScore: 0.27 });
      if (semanticDocs.length) aiUsed = true;
    }
  }

  // ---- Merge AI extras into the base groups (deduped by URL) ---------------
  const seenUrls = new Set<string>();
  for (const hit of [...studyHits, ...publicationHits, ...eventHits, ...(wpEn.status === 'fulfilled' ? wpEn.value : []), ...(wpNe.status === 'fulfilled' ? wpNe.value : [])]) {
    seenUrls.add(hit.url);
  }
  const dedupe = (hits: SearchHit[]): SearchHit[] =>
    hits.filter((h) => !seenUrls.has(h.url) && (seenUrls.add(h.url), true));

  const aiHits: SearchHit[] = [];
  for (const { doc } of semanticDocs) {
    if (aiHits.length >= 6) break;
    if (seenUrls.has(doc.url)) continue;
    seenUrls.add(doc.url);
    aiHits.push({
      id: `ai-${doc.source}-${doc.refId}`,
      title: doc.title,
      meta: doc.meta ?? undefined,
      url: doc.url,
      category: doc.category,
    });
  }

  const studyGroup = [...studyHits, ...dedupe(extraStudy)];
  const wpMerged = [
    ...(wpEn.status === 'fulfilled' ? wpEn.value : []),
    ...(wpNe.status === 'fulfilled' ? wpNe.value : []),
    ...dedupe(extraWp),
  ];
  const publicationGroup = [...publicationHits, ...dedupe(extraPublications)];
  const eventGroup = [...eventHits, ...dedupe(extraEvents)];

  const groups: { label: string; items: SearchHit[] }[] = [
    ...(studyGroup.length ? [{ label: 'Study Materials', items: studyGroup }] : []),
    ...(wpMerged.length ? groupWpHits(wpMerged) : []),
    ...(publicationGroup.length ? [{ label: 'Publications', items: publicationGroup }] : []),
    ...(eventGroup.length ? [{ label: 'Events', items: eventGroup }] : []),
    ...(aiHits.length ? [{ label: 'AI Matches', items: aiHits }] : []),
  ];

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return { query: q, total, groups, aiUsed };
}
