/**
 * Import WordPress study posts (case laws, notes, question papers) that never
 * reached the new site.
 *
 * News, blogs, opinion and historical facts are read live from WordPress; the
 * study posts are not, they live in the Resource table. The Phase-6 import only
 * covered the October extract minus its review queue, so posts held for a
 * taxonomy decision and everything published on WordPress after the extract
 * are missing from the new site.
 *
 * For every live English WordPress post that is not a live-routed article and
 * has no Resource row yet (same deterministic id, or metaTitle WP-english-<id>):
 *   - its subject comes from an approved mapping in
 *     docs/wordpress-semester-subject-mapping.review.json, else from a WordPress
 *     subject category whose name matches exactly one existing Subject (never
 *     for categories that review left unresolved, such as Family Law);
 *   - matched posts are created PUBLISHED; unmatched ones DRAFT with no subject,
 *     so an admin assigns the subject before they appear publicly.
 * Existing rows are never modified.
 *
 *   node scripts/import-missing-wp-resources.js            # dry run (default)
 *   node scripts/import-missing-wp-resources.js --apply    # create rows
 *
 * Uses DATABASE_URL and WP_ENGLISH_URL from the environment.
 */
const path = require('path');
const { generateResourceId } = require('../scripts-recovered/migration-identity.js');

const DEFAULT_WP = 'https://entertainlawyers.com/wp-json/wp/v2';

// Categories rendered live by the new site (see mapCategoryToType in src/lib/wordpress.ts).
const LIVE_ARTICLE_CATEGORIES = [58, 60, 61, 78, 81];
// Court/genre buckets that say nothing about the academic subject.
const NON_SUBJECT_CATEGORIES = new Set([1, 66, 79, 104, 105, 106, 113, 121, 126]);
const OLD_QUESTION_CATEGORY = 126;
const LAW_NOTE_CATEGORY = 121;

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&amp;|&/g, 'and')
    .replace(/labour/g, 'labor')
    .replace(/[^a-z0-9]/g, '');

const decodeEntities = (s) =>
  String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchAll(fetchImpl, WP, endpoint, fields) {
  const items = [];
  for (let page = 1; ; page++) {
    const res = await fetchImpl(`${WP}/${endpoint}?per_page=100&page=${page}&_fields=${fields}`);
    if (!res.ok) throw new Error(`WordPress ${endpoint} page ${page}: HTTP ${res.status}`);
    items.push(...(await res.json()));
    const totalPages = Number(res.headers.get('x-wp-totalpages') || 1);
    if (page >= totalPages) return items;
  }
}

function resourceType(post) {
  if (post.categories.includes(OLD_QUESTION_CATEGORY)) return 'OLD_QUESTION';
  if (post.categories.includes(LAW_NOTE_CATEGORY)) return 'LAW_NOTE';
  if (/\bcase\b|\bNKP\b|\bv(s)?\.\s/i.test(post.title)) return 'CASE_LAW';
  return 'OTHER';
}

async function importMissingWpResources({ prisma, fetchImpl = fetch, mappingFile, apply = false, wpBaseUrl = DEFAULT_WP }) {
  const WP = wpBaseUrl.replace(/\/$/, '');
  const [posts, categories, subjects] = await Promise.all([
    fetchAll(fetchImpl, WP, 'posts', 'id,slug,title,categories,content,status'),
    fetchAll(fetchImpl, WP, 'categories', 'id,name'),
    prisma.subject.findMany({ select: { id: true, name: true, semester: { select: { name: true } } } }),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, decodeEntities(c.name)]));

  const subjectsByName = new Map();
  for (const s of subjects) {
    const key = normalize(s.name);
    subjectsByName.set(key, [...(subjectsByName.get(key) || []), s]);
  }
  const findSubject = (semesterName, subjectName) =>
    subjects.filter(
      (s) =>
        normalize(s.name) === normalize(subjectName) &&
        (!semesterName || normalize(s.semester?.name) === normalize(semesterName))
    );
  const approved = new Map(
    mappingFile.subjectMappings
      .filter((m) => m.humanDecision === 'Approved')
      .map((m) => [m.wpCategoryId, m])
  );
  // Categories the review left unresolved (e.g. Family Law: I vs II) are
  // never matched by name; those posts stay DRAFT for an admin to classify.
  const unresolved = new Set(
    mappingFile.subjectMappings.filter((m) => m.humanDecision !== 'Approved').map((m) => m.wpCategoryId)
  );

  const plan = [];
  for (const raw of posts) {
    if (raw.status && raw.status !== 'publish') continue;
    if (raw.categories.some((c) => LIVE_ARTICLE_CATEGORIES.includes(c))) continue;

    const id = generateResourceId('english', String(raw.id));
    const existing = await prisma.resource.findFirst({
      where: { OR: [{ id }, { metaTitle: `WP-english-${raw.id}` }] },
      select: { id: true },
    });
    if (existing) continue;

    const post = { ...raw, title: decodeEntities(raw.title?.rendered) };
    const subjectCategories = post.categories.filter((c) => !NON_SUBJECT_CATEGORIES.has(c));

    let matches = [];
    let via = 'none';
    for (const c of subjectCategories) {
      const m = approved.get(c);
      if (m) {
        matches = findSubject(m.proposedSemester, m.proposedSubject);
        via = `approved mapping (category ${c})`;
        break;
      }
    }
    if (matches.length === 0) {
      const candidates = subjectCategories
        .filter((c) => !unresolved.has(c))
        .flatMap((c) => subjectsByName.get(normalize(categoryName.get(c))) || []);
      const unique = [...new Map(candidates.map((s) => [s.id, s])).values()];
      if (unique.length) {
        matches = unique;
        via = 'category name';
      }
    }

    const subject = matches.length === 1 ? matches[0] : null;
    plan.push({
      id,
      wpId: raw.id,
      slug: raw.slug,
      title: post.title,
      type: resourceType(post),
      content: raw.content?.rendered || '',
      subjectId: subject?.id ?? null,
      subjectLabel: subject ? `${subject.semester?.name} / ${subject.name}` : null,
      via: subject ? via : matches.length > 1 ? `ambiguous (${matches.length} subjects)` : 'no matching subject',
      wpCategories: post.categories.map((c) => categoryName.get(c) || c).join(', '),
      status: subject ? 'PUBLISHED' : 'DRAFT',
    });
  }

  if (apply) {
    for (const p of plan) {
      await prisma.resource.create({
        data: {
          id: p.id,
          title: p.title,
          content: p.content,
          type: p.type,
          status: p.status,
          subjectId: p.subjectId,
          semesterId: null,
          metaTitle: `WP-english-${p.wpId}`,
          metaDesc: p.slug,
        },
      });
    }
  }

  return { postCount: posts.length, plan };
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  try {
    const { postCount, plan } = await importMissingWpResources({
      prisma,
      mappingFile: require(path.join(__dirname, '../docs/wordpress-semester-subject-mapping.review.json')),
      apply,
      wpBaseUrl: process.env.WP_ENGLISH_URL || DEFAULT_WP,
    });
    console.log(apply ? 'APPLIED' : 'DRY RUN (pass --apply to create rows)');
    console.log(`WordPress posts: ${postCount}; missing study posts: ${plan.length}`);
    console.log(`  PUBLISHED (subject matched): ${plan.filter((p) => p.subjectId).length}`);
    console.log(`  DRAFT (needs subject):       ${plan.filter((p) => !p.subjectId).length}`);
    for (const p of plan) {
      console.log(
        `${p.status.padEnd(9)} ${String(p.wpId).padEnd(5)} ${p.type.padEnd(12)} ${(p.subjectLabel || p.via).padEnd(48)} ${p.title.slice(0, 70)}  [${p.wpCategories}]`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { importMissingWpResources };
