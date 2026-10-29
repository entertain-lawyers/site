/**
 * SCRATCH UTILITY — builds the AI embedding index locally via direct DB + WP access.
 * NOT for commit. Mirrors src/app/api/ai/search-index/route.ts corpus logic.
 *
 * Usage: GEMINI_API_KEY (from .env) + DATABASE_URL (from .env) required.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

// Load .env manually (no dotenv dependency)
const lines = readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n');
for (const line of lines) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const prisma = new PrismaClient({ log: ['error'] });
const KEY = process.env.GEMINI_API_KEY;
const GEN = 'https://generativelanguage.googleapis.com/v1beta';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

function stripHtml(raw) {
  return decodeURIComponent(
    raw.replace(/<[^>]*>/g, (h) => h)
  )
    .replace(/<[^>]+>/g, '')
    .replace(/&#8211;|&#8217;|&#8216;/g, "'")
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

//.language=javascript
const _lang_note = null;

async function embed(text) {
  const res = await fetch(`${GEN}/models/${EMBED_MODEL}:embedContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 6000) }] } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.embedding?.values ?? null;
}

function wpUrl(type, id) {
  if (type.startsWith('NEPALI')) return `/nepali/post/${id}`;
  if (type === 'BLOG') return `/blogs/${id}`;
  if (type === 'NEWS') return `/news/${id}`;
  if (type === 'FACT' || type === 'PERSONALITY') return `/historical-facts/${id}`;
  return `/blogs/${id}`;
}

// Category mapping replicated from lib/wordpress (minimal: na ids not needed—use REST default categories)
// Simplification: map by category names via WP categories API per language.
async function fetchCategoryMap(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/categories?per_page=100`, { signal: AbortSignal.timeout(15000) });
    const cats = await res.json();
    const map = new Map();
    for (const c of cats) map.set(c.id, (c.name || '').toLowerCase());
    return map;
  } catch {
    return new Map();
  }
}

// Category mapping replicated EXACTLY from lib/wordpress.mapCategoryToType
function mapCategoryToType(categories, lang) {
  if (!Array.isArray(categories)) return 'UNKNOWN';
  if (lang === 'ne') {
    if (categories.includes(56)) return 'NEPALI_ADALAT_SAMACHAR';
    if (categories.includes(57)) return 'NEPALI_NAJIRHARU';
    if (categories.includes(64)) return 'NEPALI_AIN_KANUN';
    if (categories.includes(61)) return 'NEPALI_BLOG_BICHAR';
    if (categories.includes(58)) return 'NEPALI_SAMANYA_SAMACHAR';
    return 'UNKNOWN';
  }
  if (categories.includes(61)) return 'BLOG';
  if (categories.includes(78)) return 'FACT';
  if (categories.includes(81)) return 'PERSONALITY';
  if (categories.includes(58)) return 'NEWS';
  return 'UNKNOWN';
}

async function main() {
  if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exitCode = 1; return; }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AIEmbedding" (
      id SERIAL PRIMARY KEY,
      "source" TEXT NOT NULL, "refId" TEXT NOT NULL, "title" TEXT NOT NULL,
      "meta" TEXT, "url" TEXT NOT NULL, "category" TEXT NOT NULL,
      "lang" TEXT NOT NULL DEFAULT 'en', "summary" TEXT, "vector" JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AIEmbedding_source_refId_key" ON "AIEmbedding"("source","refId")`);

  // WP rows are rebuilt fully (category mapping fixes) — remove stale ones
  await prisma.$executeRawUnsafe(`DELETE FROM "AIEmbedding" WHERE "source" = 'wp'`);

  const existing = await prisma.$queryRawUnsafe(`SELECT "source","refId","title" FROM "AIEmbedding"`);
  const existingKey = new Set(existing.map((r) => `${r.source}:${r.refId}:${r.title}`));
  console.log('existing rows:', existing.length);

  const corpus = [];

  const [resources, pubs, events] = await Promise.all([
    prisma.resource.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, title: true, type: true, subject: { select: { name: true } } }, orderBy: [{ subject: { order: 'asc' } }, { title: 'asc' }], take: 800 }),
    prisma.publication.findMany({ where: { publishDate: { lte: new Date() } }, select: { id: true, title: true, slug: true }, orderBy: { publishDate: 'desc' }, take: 300 }),
    prisma.event.findMany({ select: { id: true, title: true, slug: true }, orderBy: { eventDate: 'desc' }, take: 200 }),
  ]);

  for (const r of resources) corpus.push({ source: 'resource', refId: String(r.id), title: r.title, meta: r.subject?.name ?? null, url: `/resources/${r.id}`, category: `resource-${r.type}`, lang: 'en', summary: [r.subject?.name, String(r.type)].filter(Boolean).join(' — '), text: `${r.title}. ${r.subject?.name ?? ''} ${r.type}` });
  for (const p of pubs) corpus.push({ source: 'publication', refId: String(p.id), title: p.title, meta: null, url: `/publications/${p.slug}`, category: 'publication', lang: 'en', summary: 'Publication', text: `${p.title}. Publication.` });
  for (const e of events) corpus.push({ source: 'event', refId: String(e.id), title: e.title, meta: null, url: `/events/${e.slug}`, category: 'event', lang: 'en', summary: 'Event', text: `${e.title}. Event.` });

  for (const [lang, envName, def] of [
    ['en', 'WP_ENGLISH_URL', 'https://entertainlawyers.com/wp-json/wp/v2'],
    ['ne', 'WP_NEPALI_URL', 'https://entertainlawyers.com/nepali/wp-json/wp/v2'],
  ]) {
    const base = (process.env[envName] || def).replace(/\/+$/, '');
    try {
      const res = await fetch(`${base}/posts?status=publish&per_page=100&_embed=none`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) { console.error(`WP ${lang} fetch failed: ${res.status}`); continue; }
      const posts = await res.json();
      for (const p of posts) {
        const type = mapCategoryToType(p.categories, lang);
        if (type === 'UNKNOWN' || type === 'NEWS' || (lang === 'en' && (type.startsWith('NEPALI'))) || (lang === 'ne' && ['BLOG', 'NEWS', 'FACT', 'PERSONALITY'].includes(type))) {
          // allow natural mapping; only skip UNKNOWN
        }
        if (type === 'UNKNOWN') continue;
        const title = stripHtml(p.title?.rendered ?? '');
        const excerpt = stripHtml(p.excerpt?.rendered ?? '');
        if (!title) continue;
        corpus.push({
          source: 'wp', refId: `wp-${lang}-${p.id}`, title,
          meta: p.date ? new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
          url: wpUrl(type, p.id), category: type, lang,
          summary: excerpt.slice(0, 350), text: `${title}. ${excerpt}`.slice(0, 1200),
        });
      }
    } catch (e) {
      console.error(`WP ${lang} error:`, e.message);
    }
  }

  console.log('corpus breakdown:', {
    resource: corpus.filter(c => c.source === 'resource').length,
    publication: corpus.filter(c => c.source === 'publication').length,
    event: corpus.filter(c => c.source === 'event').length,
    wp: corpus.filter(c => c.source === 'wp').length,
  });
  console.log('corpus size:', corpus.length);

  let inserted = 0, failed = 0;
  for (const item of corpus) {
    if (existingKey.has(`${item.source}:${item.refId}:${item.title}`)) continue;
    const vec = await embed(item.text);
    if (!vec) { failed += 1; console.error('embed failed for', item.source, item.refId); await new Promise((r) => setTimeout(r, 800)); continue; }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AIEmbedding" ("source","refId","title","meta","url","category","lang","summary","vector")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       ON CONFLICT ("source","refId") DO UPDATE SET "title"=EXCLUDED."title","meta"=EXCLUDED."meta","url"=EXCLUDED."url","category"=EXCLUDED."category","lang"=EXCLUDED."lang","summary"=EXCLUDED."summary","vector"=EXCLUDED."vector"`,
      item.source, item.refId, item.title, item.meta, item.url, item.category, item.lang, item.summary, JSON.stringify(vec)
    );
    inserted += 1;
    if (inserted % 50 === 0) console.log('inserted', inserted, '/', corpus.length);
  }

  const total = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "AIEmbedding"`);
  console.log(`done — inserted ${inserted}, failed ${failed}, total rows ${total[0].n}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
