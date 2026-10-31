/**
 * Restore the body text of WordPress-migrated study resources.
 *
 * scripts/execute-neon-import.js upserted the 136 Phase-6 resources (case-law
 * summaries and law notes) without their `content` (the column did not exist
 * yet), so production shows them as "Pending Upload" / "PDF Coming Soon"
 * even though they were never PDFs. This copies each body from the staged
 * WordPress extract into the row with the same deterministic id.
 *
 * Rows imported later (they carry metaTitle "WP-english-<postId>" but are not
 * in the staged extract) get their body from the live WordPress REST API.
 *
 * Only rows whose content is NULL or blank are written, so notes edited in
 * the admin since the import are never overwritten.
 *
 *   node scripts/backfill-resource-content.js           # dry run (default)
 *   node scripts/backfill-resource-content.js --apply   # write
 *
 * Uses DATABASE_URL and WP_ENGLISH_URL from the environment.
 */
const path = require('path');
const { generateResourceId } = require('../scripts-recovered/migration-identity.js');

const DEFAULT_WP = 'https://entertainlawyers.com/wp-json/wp/v2';

const fillEmpty = (prisma, id, body) =>
  // Guard in the write so a concurrent admin edit is not clobbered.
  prisma.resource.updateMany({
    where: { id, OR: [{ content: null }, { content: '' }] },
    data: { content: body },
  });

async function backfillResourceContent({ prisma, fetchImpl = fetch, staged, apply = false, wpBaseUrl = DEFAULT_WP }) {
  const WP = wpBaseUrl.replace(/\/$/, '');
  const counts = {
    staged: staged.length,
    filled: 0,
    alreadyHasContent: 0,
    missingRow: 0,
    emptySource: 0,
    filledFromLiveWordPress: 0,
    liveWordPressFailed: 0,
  };
  const missing = [];
  const liveFailures = [];

  for (const r of staged) {
    const id = generateResourceId(r.sourceSite, String(r.wordpressPostId));
    const body = (r.content || '').trim();
    if (!body) {
      counts.emptySource++;
      continue;
    }

    const row = await prisma.resource.findUnique({ where: { id }, select: { id: true, content: true } });
    if (!row) {
      counts.missingRow++;
      missing.push(`${id} ${r.title}`);
      continue;
    }
    if (row.content && row.content.trim()) {
      counts.alreadyHasContent++;
      continue;
    }

    if (apply) await fillEmpty(prisma, id, body);
    counts.filled++;
  }

  // In a dry run the staged rows above are still empty, so skip them here.
  const stagedIds = new Set(staged.map((r) => generateResourceId(r.sourceSite, String(r.wordpressPostId))));
  const remaining = await prisma.resource.findMany({
    where: { metaTitle: { startsWith: 'WP-english-' }, OR: [{ content: null }, { content: '' }] },
    select: { id: true, title: true, metaTitle: true },
  });
  for (const row of remaining.filter((r) => !stagedIds.has(r.id))) {
    const wpId = Number(row.metaTitle.slice('WP-english-'.length));
    const res = Number.isInteger(wpId) ? await fetchImpl(`${WP}/posts/${wpId}?_fields=id,status,content`) : null;
    const post = res && res.ok ? await res.json() : null;
    const body = (post?.status === 'publish' && post.content?.rendered ? post.content.rendered : '').trim();
    if (!body) {
      counts.liveWordPressFailed++;
      liveFailures.push(`${row.id} WP#${row.metaTitle.slice(11)} HTTP ${res ? res.status : 'n/a'} ${row.title}`);
      continue;
    }
    if (apply) await fillEmpty(prisma, row.id, body);
    counts.filledFromLiveWordPress++;
  }

  return { counts, missing, liveFailures };
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  let result;
  try {
    result = await backfillResourceContent({
      prisma,
      staged: require(path.join(__dirname, '../migration-staging-recovered/resources.json')),
      apply,
      wpBaseUrl: process.env.WP_ENGLISH_URL || DEFAULT_WP,
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(apply ? 'APPLIED' : 'DRY RUN (pass --apply to write)');
  console.log(result.counts);
  if (result.missing.length) {
    console.log('Staged resources with no matching row (deleted or never imported):');
    result.missing.forEach((m) => console.log(`  - ${m}`));
  }
  if (result.liveFailures.length) {
    console.log('Rows whose WordPress post could not be fetched (left empty):');
    result.liveFailures.forEach((m) => console.log(`  - ${m}`));
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { backfillResourceContent };
