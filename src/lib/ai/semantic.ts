import { prisma } from '@/lib/prisma';
import { cosineSimilarity } from './gemini';

/**
 * Vector store for AI semantic search, backed by a plain Postgres table
 * created idempotently via raw SQL — so no Prisma migration is required.
 * The corpus is small (hundreds of docs), so cosine similarity runs in JS.
 */

export interface SemanticDoc {
  source: string;
  refId: string;
  title: string;
  meta: string | null;
  url: string;
  category: string;
  lang: string;
  summary: string;
  vector: number[];
}

/**
 * Cheap, stable content fingerprint. Stored alongside each embedding so an
 * incremental re-index notices edits to a bio or a page even when the title
 * stays the same (the old title-only comparison silently kept stale vectors).
 */
export function hashCorpusItem(item: {
  title: string;
  meta?: string | null;
  url: string;
  category: string;
  summary?: string | null;
  text: string;
}): string {
  const input = [item.title, item.meta ?? '', item.url, item.category, item.summary ?? '', item.text].join('\u0001');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `v1-${h1.toString(36)}-${h2.toString(36)}-${input.length.toString(36)}`;
}

export interface ScoredDoc {
  doc: SemanticDoc;
  /** Combined score (max of vector and lexical) used for ranking. */
  score: number;
  /** Raw cosine similarity, kept for callers that need to gate recall. */
  vectorScore: number;
  /** Title/name overlap after query expansion; 0 when no words match. */
  lexicalScore: number;
}

const MAX_LOAD = 3000;

/** Create the embedding table + unique key if they don't exist (safe to call repeatedly). */
export async function ensureEmbeddingTable(): Promise<void> {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "AIEmbedding" (
      id SERIAL PRIMARY KEY,
      "source" TEXT NOT NULL,
      "refId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "meta" TEXT,
      "url" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "lang" TEXT NOT NULL DEFAULT 'en',
      "summary" TEXT,
      "vector" JSONB NOT NULL,
      "hash" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Existing deployments predate `hash`; add it without a migration.
  await prisma.$executeRaw`ALTER TABLE "AIEmbedding" ADD COLUMN IF NOT EXISTS "hash" TEXT`;
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AIEmbedding_source_refId_key"
    ON "AIEmbedding"("source","refId")
  `;
}

export interface UpsertDoc {
  source: string;
  refId: string;
  title: string;
  meta?: string | null;
  url: string;
  category: string;
  lang?: string;
  summary?: string | null;
  vector: number[];
  hash?: string;
}

export async function upsertEmbedding(doc: UpsertDoc): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "AIEmbedding"
      ("source","refId","title","meta","url","category","lang","summary","vector","hash")
    VALUES (
      ${doc.source}, ${doc.refId}, ${doc.title}, ${doc.meta ?? null}, ${doc.url},
      ${doc.category}, ${doc.lang ?? 'en'}, ${doc.summary ?? null},
      ${JSON.stringify(doc.vector)}::jsonb, ${doc.hash ?? null}
    )
    ON CONFLICT ("source","refId") DO UPDATE SET
      "title" = EXCLUDED."title",
      "meta" = EXCLUDED."meta",
      "url" = EXCLUDED."url",
      "category" = EXCLUDED."category",
      "lang" = EXCLUDED."lang",
      "summary" = EXCLUDED."summary",
      "vector" = EXCLUDED."vector",
      "hash" = EXCLUDED."hash"
  `;
  invalidateEmbeddingCache();
}

export async function deleteEmbedding(source: string, refId: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "AIEmbedding" WHERE "source" = ${source} AND "refId" = ${refId}
  `;
  invalidateEmbeddingCache();
}

interface VectorRow {
  source: string;
  refId: string;
  title: string;
  meta: string | null;
  url: string;
  category: string;
  lang: string;
  summary: string | null;
  vector: unknown;
}

/** In-process cache: the vector table is small and changes only during index builds. */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { docs: SemanticDoc[]; at: number } | null = null;

export function invalidateEmbeddingCache(): void {
  cache = null;
}

export async function loadEmbeddings(): Promise<SemanticDoc[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.docs;
  try {
    await ensureTableOnInit();
    const rows = await prisma.$queryRaw<VectorRow[]>`
      SELECT "source","refId","title","meta","url","category","lang","summary","vector"
      FROM "AIEmbedding"
      LIMIT ${MAX_LOAD}
    `;
    const docs = rows
      .map((r) => ({ row: r, vector: r.vector as unknown as number[] }))
      .filter(({ vector }) => Array.isArray(vector) && vector.every((n) => typeof n === 'number' && Number.isFinite(n)))
      .map(({ row, vector }) => ({
        source: row.source,
        refId: row.refId,
        title: row.title,
        meta: row.meta,
        url: row.url,
        category: row.category,
        lang: row.lang,
        summary: row.summary ?? '',
        vector,
      }));
    cache = { docs, at: Date.now() };
    return docs;
  } catch (error) {
    // A missing/broken table must never take search or the chatbot down —
    // features degrade to heuristics / grounded fallback replies instead.
    console.error('[ai/semantic] embedding load failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

/** Memoized per-lambda so the index route and search share one check. */
let tableReady = false;
async function ensureTableOnInit(): Promise<void> {
  if (tableReady) return;
  await ensureEmbeddingTable();
  tableReady = true;
}

/**
 * Normalize text for lexical matching: lowercase, punctuation → space, and
 * collapse whitespace. Devanagari letters are preserved (no transliteration
 * here — that's handled elsewhere); this only needs to make exact names and
 * titles robust.
 */
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Inverse document frequency over the current index's titles.
 *
 * Shared words like "semester" or "subjects" appear in many docs; distinctive
 * words like "1st" or a person's surname appear in one. Weighting matches by
 * IDF makes "Which subjects are in the 1st semester?" rank the 1st-semester
 * doc above all the other semester docs.
 */
function buildTitleIdf(docs: SemanticDoc[]): { idf: Map<string, number>; total: number } {
  const df = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set(normalizeForMatch(doc.title).split(' ').filter(Boolean));
    for (const token of seen) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const total = Math.max(docs.length, 1);
  const idf = new Map<string, number>();
  for (const [token, count] of df) idf.set(token, Math.log(1 + total / Math.max(count, 1)));
  return { idf, total };
}

/**
 * Query rewriting for the lexical pass.
 *
 * Visitors use everyday words ("past papers", "notes", "price", "who is")
 * while the index uses the site's vocabulary ("old question", "law note",
 * "pricing"). Expanding a few high-value synonyms before title matching makes
 * exact content findable without weakening the embedding score.
 */
const QUERY_SYNONYMS: Array<[RegExp, string]> = [
  [/\b(?:past|previous|old)\s+(?:exam\s+)?(?:papers?|questions?)\b/gi, 'old question'],
  [/\bexam\s+(?:papers?|questions?)\b/gi, 'old question'],
  [/\b(?:law\s+)?notes?\b/gi, 'law note'],
  [/\bcase[- ]?laws?\b|\bjudgments?\b|\bprecedents?\b/gi, 'case law'],
  [/\b(?:price|prices|pricing|fees?|cost)\b/gi, 'pricing'],
  [/\b(?:team\s+members?|staff|researchers?)\b/gi, 'team'],
  [/\b(?:who\s+is|who's|tell\s+me\s+about|profile\s+of)\b/gi, ' '],
  [/\b(?:syllabus|curriculum)\b/gi, 'subjects'],
];

/** Rewrite a question into index vocabulary (idempotent, safe on any input). */
export function expandQuery(text: string): string {
  let out = text;
  for (const [pattern, replacement] of QUERY_SYNONYMS) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Question words that carry no retrieval signal. Without this list, a phrase
 * like "what is consideration in contract law" matches the word "what" in
 * "What You Can Find…" and scores as a perfect hit.
 */
const QUERY_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'be', 'by', 'can', 'could', 'did', 'do', 'does',
  'for', 'from', 'has', 'have', 'how', 'i', 'in', 'is', 'it', 'its', 'me', 'my',
  'of', 'on', 'or', 'our', 'please', 'should', 'tell', 'that', 'the', 'their', 'them',
  'there', 'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who',
  'why', 'will', 'with', 'would', 'you', 'your', 'site', 'website', 'platform',
  'entertain', 'lawyers', 'law', 'legal', 'information', 'details', 'know',
]);

/**
 * Word/title overlap score for a doc, independent of embeddings.
 *
 * Embeddings are weak on proper nouns — a team member's name can score below
 * the chat's grounding threshold — while an exact title/name match should
 * always win. Only *distinctive* query words count (rare in the title index,
 * not a question filler), and the score is driven by how much rare weight
 * matched, not by the ratio of matched words:
 *   1.00  full query appears in the title
 *   0.35–1.00 one or more rare title words match (saturating)
 *   0.00  no distinctive overlap
 */
function lexicalScore(
  queryText: string,
  doc: SemanticDoc,
  index: { idf: Map<string, number>; total: number }
): number {
  const { idf, total } = index;
  const query = normalizeForMatch(queryText);
  if (!query) return 0;

  const title = normalizeForMatch(doc.title);
  if (title.includes(query)) return 1;

  const meta = normalizeForMatch(doc.meta ?? '');
  const summary = normalizeForMatch(doc.summary);

  const values = [...idf.values()];
  if (!values.length) return 0;
  const maxIdf = Math.max(...values);
  // A word must be rare in the index to prove relevance. The floor scales
  // down for tiny indexes (a five-doc index has no "common" words).
  const cutoff = Math.min(2.2, Math.log(1 + Math.max(total, 1) / 2));

  // Singular/plural variants: the index stores "Notes" and "Questions", while
  // a question may say "note" or "question".
  const variants = (token: string): string[] =>
    token.endsWith('s') && token.length > 3 ? [token, token.slice(0, -1)] : [token, `${token}s`];
  const weightOf = (token: string): number => {
    for (const variant of variants(token)) {
      const weight = idf.get(variant);
      if (weight !== undefined) return weight;
    }
    return 0;
  };
  const inText = (haystack: string, token: string): boolean =>
    variants(token).some((variant) => haystack.includes(variant));

  const tokens = [
    ...new Set(
      query
        .split(' ')
        .filter((t) => t.length >= 2 && !QUERY_STOPWORDS.has(t) && weightOf(t) >= cutoff)
    ),
  ];
  if (!tokens.length) return 0;

  let titleMatched = 0;
  let bodyMatched = 0;
  for (const token of tokens) {
    const weight = weightOf(token);
    if (inText(title, token)) {
      titleMatched += weight;
    } else if (inText(meta, token) || inText(summary, token)) {
      bodyMatched += weight;
    }
  }

  // A title hit is strong evidence; a summary/meta mention is only a hint and
  // is capped below the site-page gate so unrelated pages cannot ride along.
  if (titleMatched === 0) {
    if (bodyMatched === 0) return 0;
    return Math.min(0.45, 0.2 + 0.25 * (bodyMatched / maxIdf));
  }
  return Math.min(1, 0.6 + 0.4 * (titleMatched / maxIdf));
}

/**
 * Cosine-ranked nearest docs above `minScore`.
 *
 * Vector similarity is combined with a lexical title/name score via `max`, so
 * exact lookups ("Ram Babu Das", "Contact") stay reliable even when the
 * embedding model ranks them oddly. Pass `queryText` to enable the hybrid.
 */
export async function searchEmbeddings(
  queryVector: number[],
  {
    limit = 6,
    minScore = 0.28,
    queryText,
  }: { limit?: number; minScore?: number; queryText?: string } = {}
): Promise<ScoredDoc[]> {
  const docs = await loadEmbeddings();
  const index = queryText ? buildTitleIdf(docs) : null;
  const lexicalQuery = queryText ? expandQuery(queryText) : '';
  return docs
    .map((doc) => {
      const vectorScore = cosineSimilarity(queryVector, doc.vector);
      const lexicalScoreValue = index && lexicalQuery ? lexicalScore(lexicalQuery, doc, index) : 0;
      return {
        doc,
        score: Math.max(vectorScore, lexicalScoreValue),
        vectorScore,
        lexicalScore: lexicalScoreValue,
      };
    })
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score || a.doc.title.length - b.doc.title.length)
    .slice(0, limit);
}
