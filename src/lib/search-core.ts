import { prisma } from '@/lib/prisma';
import {
  getWordPressPosts,
  getWordPressCategories,
  mapCategoryToType,
  decodeHtmlEntities,
  WordPressLanguage,
} from '@/lib/wordpress';
import { searchMatches, searchScore } from '@/lib/translit-search';
import { rateLimit } from '@/lib/rate-limit';
import { geminiEmbed, isAiEnabled } from '@/lib/ai/gemini';
import { normalizeSearchQuery } from '@/lib/ai/normalize';
import { searchEmbeddings } from '@/lib/ai/semantic';
import { SITE_KNOWLEDGE } from '@/lib/ai/site-knowledge';

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
  /** Why a full-text hit matched, when the title alone doesn't show it. */
  snippet?: string;
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

/**
 * Absolute permalink for WordPress posts that have no in-app detail route
 * (case laws, subject notes, question papers...). Those live only on the WP
 * site, so linking straight to the canonical URL beats hiding them.
 */
function absoluteWpUrl(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.hostname === 'entertainlawyers.com') url.hostname = 'www.entertainlawyers.com';
    return url.toString();
  } catch {
    return null;
  }
}

/** Strip HTML/entities into plain text for snippets and title matching. */
function plainText(html: string | undefined): string {
  if (!html) return '';
  return decodeHtmlEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape a literal string for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * All occurrences of a query word in the body text (capped). Latin words use
 * word boundaries plus an optional plural ("fee" matches "fees" but not
 * "feels"); Devanagari words use plain substrings because suffixes are glued
 * to the stem ("अधिकार" inside "अधिकारमा").
 */
function findOccurrences(haystack: string, word: string): number[] {
  const out: number[] = [];
  if (/^[a-z0-9]+$/i.test(word)) {
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?:s|es)?(?![\\p{L}\\p{N}])`,
      'giu'
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack)) && out.length < 40) {
      out.push(m.index);
      re.lastIndex = m.index + 1;
    }
    return out;
  }

  let i = haystack.indexOf(word);
  while (i >= 0 && out.length < 40) {
    out.push(i);
    i = haystack.indexOf(word, i + 1);
  }
  return out;
}

/**
 * Short excerpt that shows *why* a body-only hit matched. Every word of the
 * query must appear in the post (WP's own search is a loose full-text match
 * and happily returns posts sharing a single word), and the window is chosen
 * to cover as many of those words as possible.
 */
function buildSnippet(html: string | undefined, q: string): string | undefined {
  const text = plainText(html);
  if (!text) return undefined;

  const lower = text.toLowerCase();
  const words = [...new Set(q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2))];
  if (!words.length) return undefined;

  // Every query word must occur somewhere in the body; collect all (capped)
  // occurrences so the window can find the closest cluster rather than just
  // the first mention of each word.
  const occurrences: number[][] = words.map((w) => findOccurrences(lower, w));
  if (occurrences.some((at) => at.length === 0)) return undefined;

  const WINDOW = 220;
  let bestAt = Math.min(...occurrences.map((at) => at[0]));
  let bestCover = 0;
  for (const at of occurrences.flat()) {
    const start = Math.max(0, at - 60);
    const end = start + WINDOW;
    const cover = occurrences.filter((wordAt) => wordAt.some((p) => p >= start && p < end)).length;
    if (cover > bestCover) {
      bestCover = cover;
      bestAt = at;
    }
  }

  // Two-word queries must show both words together — a post that mentions
  // "court" in one paragraph and "fee" five paragraphs later isn't a match
  // worth surfacing (and its snippet reads as random).
  const minCover = words.length <= 2 ? words.length : Math.max(2, words.length - 1);
  if (bestCover < minCover) return undefined;

  const start = Math.max(0, bestAt - 60);
  const end = Math.min(text.length, start + WINDOW);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

interface WpIndexPost {
  id: number;
  title: string;
  date?: string;
  /** Canonical WP permalink — used for posts with no in-app route. */
  link?: string;
  categories: number[];
}

/**
 * Cached title index for one WP site. Roman and Devanagari queries both need
 * to see every title (WP's own `search` is full-text and returns 0 for roman
 * queries against Devanagari titles), so we keep a compact list in memory.
 * 5 pages × 100 posts covers the archive; older posts still appear through
 * WP's native full-text search.
 */
const WP_INDEX_TTL_MS = 5 * 60 * 1000;
const WP_INDEX_MAX_PAGES = 5;
const wpIndexCache = new Map<WordPressLanguage, { at: number; posts: WpIndexPost[] }>();

async function getWpTitleIndex(lang: WordPressLanguage): Promise<WpIndexPost[]> {
  const cached = wpIndexCache.get(lang);
  if (cached && Date.now() - cached.at < WP_INDEX_TTL_MS) return cached.posts;

  try {
    const fetchPage = (page: number) =>
      getWordPressPosts({
        status: 'publish',
        lang,
        perPage: 100,
        page,
        orderBy: 'date',
        order: 'desc',
        fields: 'id,title,date,link,categories',
        timeoutMs: 7000,
      });

    const first = await fetchPage(1);
    const pages = Math.min(first.totalPages || 1, WP_INDEX_MAX_PAGES);
    const rest =
      pages > 1
        ? await Promise.allSettled(
            Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))
          )
        : [];

    const posts = [first, ...rest.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))]
      .flatMap((r) => (Array.isArray(r.data) ? r.data : []))
      .map((p) => ({
        id: p.id,
        title: cleanTitle(p.title?.rendered ?? ''),
        date: p.date,
        link: p.link,
        categories: p.categories ?? [],
      }))
      .filter((p) => p.title);

    wpIndexCache.set(lang, { at: Date.now(), posts });
    return posts;
  } catch {
    return cached?.posts ?? [];
  }
}

/**
 * WP category id → display name, cached for an hour. Used to label posts that
 * fall outside the app's own taxonomy (e.g. "Contract Law-I", "Writs").
 */
const WP_CATEGORY_TTL_MS = 60 * 60 * 1000;
const wpCategoryCache = new Map<WordPressLanguage, { at: number; names: Map<number, string> }>();

async function getWpCategoryNames(lang: WordPressLanguage): Promise<Map<number, string>> {
  const cached = wpCategoryCache.get(lang);
  if (cached && Date.now() - cached.at < WP_CATEGORY_TTL_MS) return cached.names;

  try {
    const res = await getWordPressCategories({ lang, perPage: 100, fields: 'id,name', timeoutMs: 7000 });
    const names = new Map((res.data ?? []).map((c) => [c.id, c.name]));
    wpCategoryCache.set(lang, { at: Date.now(), names });
    return names;
  } catch {
    return cached?.names ?? new Map();
  }
}

/** Best display category for a post the app's own taxonomy doesn't cover. */
const GENERIC_CATEGORIES = new Set(['uncategorized', 'others', 'other', 'general']);

function articleCategory(categories: number[], names: Map<number, string>): string {
  const usable: string[] = [];
  for (const id of categories) {
    const name = names.get(id)?.trim();
    if (name && !GENERIC_CATEGORIES.has(name.toLowerCase())) usable.push(name);
  }
  // Prefer the most specific (longest) label — "Contract Law-I" beats "Civil".
  usable.sort((a, b) => b.length - a.length);
  return usable.length ? `WP_${usable[0]}` : 'WP_Article';
}

/**
 * Search one WP language site.
 *
 * Two passes, both relevance-gated:
 *  1. Title index — strict, transliteration-aware title matching. This is what
 *     makes "adalati dastur" find "अदालती दस्तुर" (and vice versa).
 *  2. WP native full-text search — keeps body matches, but only when the term
 *     appears in the title or in a snippet we can show the user.
 *
 * Posts outside the app's taxonomy (case laws, subject notes, question
 * papers) are still included: they have no in-app detail route, so they link
 * to their canonical WordPress permalink instead of being dropped.
 */
async function searchWordPress(
  lang: WordPressLanguage,
  q: string,
  limit: number
): Promise<SearchHit[]> {
  const [native, index, categoryNames] = await Promise.allSettled([
    getWordPressPosts({ search: q, status: 'publish', lang, perPage: 12, embed: false }),
    getWpTitleIndex(lang),
    getWpCategoryNames(lang),
  ]);

  const names = categoryNames.status === 'fulfilled' ? categoryNames.value : new Map<number, string>();
  const scored = new Map<string, { hit: SearchHit; score: number; date: string }>();

  const makeHit = (
    id: string,
    wpId: number,
    title: string,
    date: string | undefined,
    type: string,
    categories: number[],
    link: string | undefined,
    snippet?: string
  ): { hit: SearchHit; score: number; date: string } | null => {
    const external = type === 'UNKNOWN' ? absoluteWpUrl(link) : null;
    if (type === 'UNKNOWN' && !external) return null;
    return {
      hit: {
        id,
        title,
        meta: date
          ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : undefined,
        snippet,
        url: external ?? wpUrl(type, wpId),
        category: type === 'UNKNOWN' ? articleCategory(categories, names) : type,
      },
      score: 0,
      date: date ?? '',
    };
  };

  if (index.status === 'fulfilled') {
    for (const p of index.value) {
      const score = searchScore(p.title, q);
      if (score < 0.7) continue;
      const type = mapCategoryToType(p.categories, lang);
      const entry = makeHit(`wp-${p.id}`, p.id, p.title, p.date, type, p.categories, p.link);
      if (!entry) continue;
      entry.score = score;
      scored.set(`wp-${p.id}`, entry);
    }
  }

  if (native.status === 'fulfilled') {
    for (const p of native.value.data) {
      const title = cleanTitle(p.title?.rendered ?? '');
      if (!title) continue;
      const type = mapCategoryToType(p.categories, lang);

      const score = searchScore(title, q);
      // A body-only match is kept only when we can show the matching text.
      const snippet = score >= 0.7 ? undefined : buildSnippet(p.content?.rendered || p.excerpt?.rendered, q);
      if (score < 0.7 && !snippet) continue;

      const id = `wp-${p.id}`;
      const existing = scored.get(id);
      if (existing && existing.score >= score) continue;

      const entry = makeHit(id, p.id, title, p.date, type, p.categories ?? [], p.link, snippet);
      if (!entry) continue;
      entry.score = score;
      scored.set(id, entry);
    }
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((entry) => entry.hit);
}

function groupWpHits(hits: SearchHit[]) {
  const byLabel = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    // `WP_<category name>` = a WP post outside the app's taxonomy; the label
    // is its real WordPress category (e.g. "Contract Law-I").
    const label =
      WP_LABELS[hit.category] ??
      (hit.category.startsWith('WP_') ? hit.category.slice(3) : WP_LABELS.UNKNOWN);
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

  const [resources, publications, events, teamMembers, wpEn, wpNe] = await Promise.allSettled([
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
    // 4. Team members (so "Sushma Acharya" finds her profile)
    prisma.teamMember.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, slug: true, designation: true },
      orderBy: { displayOrder: 'asc' },
    }),
    // 5. WordPress (both EN and NP sites)
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

  const teamHits: SearchHit[] =
    teamMembers.status === 'fulfilled'
      ? teamMembers.value
          .filter((m) => searchMatches(m.name, q) || searchMatches(m.designation, q))
          .slice(0, 6)
          .map((m) => ({
            id: m.id,
            title: m.name,
            meta: m.designation,
            url: `/team/${m.slug}`,
            category: 'team',
          }))
      : [];

  // Static site pages (about, contact, pricing…) benefit from search too.
  const siteHits: SearchHit[] = SITE_KNOWLEDGE.filter(
    (d) => d.refId !== 'site-team-roster' && searchMatches(d.title, q)
  )
    .slice(0, 3)
    .map((d) => ({
      id: d.refId,
      title: d.title,
      meta: 'Entertain Lawyers',
      url: d.url,
      category: d.category,
    }));

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
      studyHits.length + publicationHits.length + eventHits.length + teamHits.length + siteHits.length +
      (wpEn.status === 'fulfilled' ? wpEn.value.length : 0) +
      (wpNe.status === 'fulfilled' ? wpNe.value.length : 0);
    const keywords = baseTotal < 3 ? await normalizeSearchQuery(q) : null;

    if (keywords?.length) {
      // Normalized keywords feed the same DB/WP passes the raw query ran, but
      // only the single most specific one: a generic term like "अदालत" would
      // drag in every post that mentions court — exactly the noise this
      // search is meant to avoid.
      const extraKeywords = keywords
        .filter((k) => k.includes(' ') || k.trim().length >= 6)
        .slice(0, 1);

      const wpExtraResults = await Promise.allSettled(
        extraKeywords.flatMap((k) => [
          searchWordPress('en' as WordPressLanguage, k, 4),
          searchWordPress('ne' as WordPressLanguage, k, 4),
        ])
      );
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

      // A snippet is already proof of a real body match for the normalized
      // keyword, so keep those too (e.g. "kort fee" → "court fee" case law).
      extraWp = wpExtraResults
        .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .filter((h) => Boolean(h.snippet) || matchesExtra(h.title));
      aiUsed = true;
    }

    // 2) Semantic pass. Embeddings are only a *recall* aid: a vector hit is
    //    kept only when it also shares a real word with the query. Without
    //    that gate the index surfaces unrelated posts — the same handful for
    //    every query, whatever the user typed.
    const qvec = await embedQueryCached(keywords?.length ? [q, ...keywords].join(' ') : q);
    if (qvec) {
      const candidates = await searchEmbeddings(qvec, { limit: 60, minScore: 0.2, queryText: q });
      semanticDocs = candidates
        .filter(({ doc }) => searchMatches(`${doc.title} ${doc.summary}`, q))
        .slice(0, 4);
      if (semanticDocs.length) aiUsed = true;
    }
  }

  // ---- Merge AI extras into the base groups (deduped by URL) ---------------
  const seenUrls = new Set<string>();
  for (const hit of [...studyHits, ...publicationHits, ...eventHits, ...teamHits, ...siteHits, ...(wpEn.status === 'fulfilled' ? wpEn.value : []), ...(wpNe.status === 'fulfilled' ? wpNe.value : [])]) {
    seenUrls.add(hit.url);
  }
  const dedupe = (hits: SearchHit[]): SearchHit[] =>
    hits.filter((h) => !seenUrls.has(h.url) && (seenUrls.add(h.url), true));

  const aiHits: SearchHit[] = [];
  for (const { doc } of semanticDocs) {
    if (aiHits.length >= 4) break;
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
    ...(teamHits.length ? [{ label: 'Team', items: teamHits }] : []),
    ...(siteHits.length ? [{ label: 'Entertain Lawyers', items: siteHits }] : []),
    ...(wpMerged.length ? groupWpHits(wpMerged) : []),
    ...(publicationGroup.length ? [{ label: 'Publications', items: publicationGroup }] : []),
    ...(eventGroup.length ? [{ label: 'Events', items: eventGroup }] : []),
    ...(aiHits.length ? [{ label: 'AI Matches', items: aiHits }] : []),
  ];

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return { query: q, total, groups, aiUsed };
}
