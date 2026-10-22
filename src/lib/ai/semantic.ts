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

export interface ScoredDoc {
  doc: SemanticDoc;
  score: number;
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
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
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
}

export async function upsertEmbedding(doc: UpsertDoc): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "AIEmbedding"
      ("source","refId","title","meta","url","category","lang","summary","vector")
    VALUES (
      ${doc.source}, ${doc.refId}, ${doc.title}, ${doc.meta ?? null}, ${doc.url},
      ${doc.category}, ${doc.lang ?? 'en'}, ${doc.summary ?? null},
      ${JSON.stringify(doc.vector)}::jsonb
    )
    ON CONFLICT ("source","refId") DO UPDATE SET
      "title" = EXCLUDED."title",
      "meta" = EXCLUDED."meta",
      "url" = EXCLUDED."url",
      "category" = EXCLUDED."category",
      "lang" = EXCLUDED."lang",
      "summary" = EXCLUDED."summary",
      "vector" = EXCLUDED."vector"
  `;
}

export async function deleteEmbedding(source: string, refId: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "AIEmbedding" WHERE "source" = ${source} AND "refId" = ${refId}
  `;
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

export async function loadEmbeddings(): Promise<SemanticDoc[]> {
  const rows = await prisma.$queryRaw<VectorRow[]>`
    SELECT "source","refId","title","meta","url","category","lang","summary","vector"
    FROM "AIEmbedding"
    LIMIT ${MAX_LOAD}
  `;
  return rows
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
}

/** Cosine-ranked nearest docs above `minScore`. */
export async function searchEmbeddings(
  queryVector: number[],
  { limit = 6, minScore = 0.28 }: { limit?: number; minScore?: number } = {}
): Promise<ScoredDoc[]> {
  const docs = await loadEmbeddings();
  return docs
    .map((doc) => ({ doc, score: cosineSimilarity(queryVector, doc.vector) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
