import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getWordPressPosts,
  mapCategoryToType,
  decodeHtmlEntities,
  WordPressLanguage,
} from '@/lib/wordpress';
import { geminiEmbed, isAiEnabled } from '@/lib/ai/gemini';
import { ensureEmbeddingTable, upsertEmbedding } from '@/lib/ai/semantic';

/** Batch embedding over the WP/DB corpus needs a budget beyond 10s. */
export const maxDuration = 60;

export const dynamic = 'force-dynamic';

/**
 * AI search-index ingestion (ADMIN/EDITOR only).
 *
 * Embeds the site's searchable content into the AIEmbedding table and is
 * incremental: rows whose title is unchanged are skipped. Because serverless
 * functions have tight time limits, one call processes at most `batch` items
 * and returns the next offset — keep calling until `done: true`:
 *
 *   POST /api/ai/search-index  { "batch": 40 }        → { offset, done, ... }
 *
 * With ~40 items per call and ~0.3s per embed, one call stays well under
 * serverless time limits; Gemini's free embed quota is far above our needs.
 */

interface CorpusItem {
  source: string;
  refId: string;
  title: string;
  meta: string | null;
  url: string;
  category: string;
  lang: string;
  summary: string;
  text: string;
}

function stripHtml(raw: string): string {
  return decodeHtmlEntities(raw.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function wpUrl(type: string, id: number): string {
  if (type.startsWith('NEPALI')) return `/nepali/post/${id}`;
  if (type === 'BLOG') return `/blogs/${id}`;
  if (type === 'NEWS') return `/news/${id}`;
  if (type === 'FACT' || type === 'PERSONALITY') return `/historical-facts/${id}`;
  return `/blogs/${id}`;
}

async function buildCorpus(): Promise<CorpusItem[]> {
  const [resources, publications, events, wpEn, wpNe] = await Promise.allSettled([
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, type: true, subject: { select: { name: true } } },
      orderBy: [{ subject: { order: 'asc' } }, { title: 'asc' }],
      take: 800,
    }),
    prisma.publication.findMany({
      where: { publishDate: { lte: new Date() } },
      select: { id: true, title: true, slug: true },
      orderBy: { publishDate: 'desc' },
      take: 300,
    }),
    prisma.event.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { eventDate: 'desc' },
      take: 200,
    }),
    getWordPressPosts({ status: 'publish', lang: 'en' as WordPressLanguage, perPage: 100, embed: true }),
    getWordPressPosts({ status: 'publish', lang: 'ne' as WordPressLanguage, perPage: 100, embed: true }),
  ]);

  const corpus: CorpusItem[] = [];

  if (resources.status === 'fulfilled') {
    for (const r of resources.value) {
      corpus.push({
        source: 'resource',
        refId: String(r.id),
        title: r.title,
        meta: r.subject?.name ?? null,
        url: `/resources/${r.id}`,
        category: `resource-${r.type}`,
        lang: 'en',
        summary: [r.subject?.name, String(r.type)].filter(Boolean).join(' — '),
        text: `${r.title}. ${r.subject?.name ?? ''} ${r.type}`.trim(),
      });
    }
  }

  if (publications.status === 'fulfilled') {
    for (const p of publications.value) {
      corpus.push({
        source: 'publication',
        refId: String(p.id),
        title: p.title,
        meta: null,
        url: `/publications/${p.slug}`,
        category: 'publication',
        lang: 'en',
        summary: 'Publication',
        text: `${p.title}. Publication.`,
      });
    }
  }

  if (events.status === 'fulfilled') {
    for (const e of events.value) {
      corpus.push({
        source: 'event',
        refId: String(e.id),
        title: e.title,
        meta: null,
        url: `/events/${e.slug}`,
        category: 'event',
        lang: 'en',
        summary: 'Event',
        text: `${e.title}. Event.`,
      });
    }
  }

  for (const [result, lang] of [
    [wpEn, 'en'],
    [wpNe, 'ne'],
  ] as const) {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value?.data)) continue;
    for (const p of result.value.data) {
      const type = mapCategoryToType(p.categories, lang as WordPressLanguage);
      if (type === 'UNKNOWN') continue;
      const title = stripHtml(p.title?.rendered ?? '');
      const excerpt = stripHtml(p.excerpt?.rendered ?? '');
      if (!title) continue;
      corpus.push({
        source: 'wp',
        refId: `wp-${lang}-${p.id}`,
        title,
        meta: p.date ? new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
        url: wpUrl(type, p.id),
        category: type,
        lang,
        summary: excerpt.slice(0, 350),
        text: `${title}. ${excerpt}`.trim().slice(0, 1200),
      });
    }
  }

  return corpus;
}

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

  const body = (await request.json().catch(() => ({}))) as { batch?: number; offset?: number; reset?: boolean };
  const batch = Math.min(Math.max(body.batch ?? 40, 1), 80);
  const offset = Math.max(body.offset ?? 0, 0);

  await ensureEmbeddingTable();
  if (body.reset) {
    await prisma.$executeRaw`DELETE FROM "AIEmbedding"`;
  }

  const existing = await prisma.$queryRaw<{ source: string; refId: string; title: string }[]>`
    SELECT "source","refId","title" FROM "AIEmbedding"
  `;
  const existingKey = new Map(existing.map((r) => [`${r.source}:${r.refId}`, r.title]));

  const corpus = await buildCorpus();
  let embedded = 0;
  let skipped = 0;
  let index = offset;

  while (index < corpus.length && embedded < batch) {
    const item = corpus[index];
    index += 1;
    if (existingKey.get(`${item.source}:${item.refId}`) === item.title) {
      skipped += 1;
      continue;
    }
    const vector = await geminiEmbed(item.text);
    if (!vector) break; // embed failures end the batch; caller retries the same offset
    await upsertEmbedding({ ...item, vector });
    embedded += 1;
  }

  const done = index >= corpus.length;
  return NextResponse.json({
    total: corpus.length,
    processed: index - offset,
    embedded,
    skipped,
    offset: done ? corpus.length : index,
    done,
  });
}
