/**
 * Rebuild the AI knowledge index from the command line.
 *
 *   npm run ai:index                 # incremental (only changed content)
 *   npm run ai:index -- --reset      # clear the vector table, then rebuild
 *   npm run ai:index -- --only=team  # limit to one corpus source
 *
 * Uses the same `src/lib/ai/corpus.ts` builder as the admin UI / API route, so
 * the CLI and the app never drift apart. Requires DATABASE_URL and
 * GEMINI_API_KEY in `.env` (loaded via dotenv).
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { buildCorpus, corpusBreakdown } from '../src/lib/ai/corpus';
import { ensureEmbeddingTable, upsertEmbedding, hashCorpusItem } from '../src/lib/ai/semantic';
import { geminiEmbed } from '../src/lib/ai/gemini';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? Math.max(1, Number(limitArg) || 0) : 0;

async function embedWithRetry(text: string, tries = 3): Promise<number[] | null> {
  for (let attempt = 0; attempt < tries; attempt++) {
    const vector = await geminiEmbed(text);
    if (vector) return vector;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return null;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing — cannot build embeddings.');
  }

  await ensureEmbeddingTable();
  if (reset) {
    await prisma.$executeRaw`DELETE FROM "AIEmbedding"`;
    console.log('Cleared the existing AIEmbedding table.');
  }

  const existing = await prisma.$queryRaw<{ source: string; refId: string; hash: string | null }[]>`
    SELECT "source","refId","hash" FROM "AIEmbedding"
  `;
  const existingHash = new Map(existing.map((r) => [`${r.source}:${r.refId}`, r.hash]));

  let corpus = await buildCorpus();
  if (only) corpus = corpus.filter((item) => item.source === only);
  if (limit) corpus = corpus.slice(0, limit);

  console.log('Corpus:', corpus.length, 'items', corpusBreakdown(corpus));

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, item] of corpus.entries()) {
    const hash = hashCorpusItem(item);
    if (existingHash.get(`${item.source}:${item.refId}`) === hash) {
      skipped += 1;
      continue;
    }

    const vector = await embedWithRetry(item.text);
    if (!vector) {
      failed += 1;
      console.error(`✗ embed failed: ${item.source}:${item.refId} (${item.title})`);
      continue;
    }

    await upsertEmbedding({ ...item, vector, hash });
    embedded += 1;

    if (embedded % 10 === 0 || index === corpus.length - 1) {
      console.log(`… ${index + 1}/${corpus.length} (embedded ${embedded}, skipped ${skipped}, failed ${failed})`);
    }
  }

  const total = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "AIEmbedding"`;
  console.log(
    `\nDone — embedded ${embedded}, skipped ${skipped}, failed ${failed}. Total vectors: ${total[0]?.n ?? 0}.`
  );
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
