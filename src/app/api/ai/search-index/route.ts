import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { geminiEmbed, isAiEnabled } from '@/lib/ai/gemini';
import { ensureEmbeddingTable, upsertEmbedding, hashCorpusItem } from '@/lib/ai/semantic';
import { buildCorpus, corpusBreakdown } from '@/lib/ai/corpus';

/** Batch embedding over the whole site corpus needs a budget beyond 10s. */
export const maxDuration = 60;

export const dynamic = 'force-dynamic';

/**
 * AI search-index ingestion (ADMIN/EDITOR only).
 *
 * Embeds every searchable part of the site into the `AIEmbedding` table:
 *   site knowledge (about/contact/navigation/pricing), team profiles (full
 *   details), FAQs, plans, semester taxonomy, resources, publications, events,
 *   CMS posts and WordPress posts (English + Nepali).
 *
 * Incremental: rows whose content hash is unchanged are skipped, so edits to a
 * bio or a page are picked up on the next run even when the title is the same.
 * Serverless functions have tight time limits, so one call processes at most
 * `batch` items and returns the next offset — keep calling until `done: true`:
 *
 *   POST /api/ai/search-index  { "batch": 40 }              → { offset, done, … }
 *   POST /api/ai/search-index  { "reset": true, "batch": 40 } → full rebuild
 *
 * The admin UI at /admin/ai drives this loop automatically.
 */
export async function POST(request: Request) {
  // Editors/admins only — this writes to the database.
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== 'ADMIN' && role !== 'EDITOR')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'AI not configured (missing GEMINI_API_KEY)' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    batch?: number;
    offset?: number;
    reset?: boolean;
  };
  const batch = Math.min(Math.max(body.batch ?? 40, 1), 80);
  const offset = Math.max(body.offset ?? 0, 0);

  await ensureEmbeddingTable();
  if (body.reset) {
    await prisma.$executeRaw`DELETE FROM "AIEmbedding"`;
  }

  const existing = await prisma.$queryRaw<{ source: string; refId: string; hash: string | null }[]>`
    SELECT "source","refId","hash" FROM "AIEmbedding"
  `;
  const existingHash = new Map(existing.map((r) => [`${r.source}:${r.refId}`, r.hash]));

  const corpus = await buildCorpus();
  const breakdown = corpusBreakdown(corpus);
  let embedded = 0;
  let skipped = 0;
  let failed = 0;
  let index = offset;

  while (index < corpus.length && embedded < batch) {
    const item = corpus[index];
    index += 1;
    const hash = hashCorpusItem(item);
    if (existingHash.get(`${item.source}:${item.refId}`) === hash) {
      skipped += 1;
      continue;
    }
    const vector = await geminiEmbed(item.text);
    if (!vector) {
      failed += 1;
      // Embedding quota/network hiccup: stop before skipping this item so the
      // caller can retry the same offset (content before it is already saved).
      break;
    }
    await upsertEmbedding({ ...item, vector, hash });
    embedded += 1;
  }

  const done = index >= corpus.length;
  return NextResponse.json({
    total: corpus.length,
    processed: index - offset,
    embedded,
    skipped,
    failed,
    breakdown,
    offset: done ? corpus.length : index,
    done,
  });
}
