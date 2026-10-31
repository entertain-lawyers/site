import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { backfillResourceContent } = require('./backfill-resource-content.js');
const { generateResourceId } = require('../scripts-recovered/migration-identity.js');

type Row = { id: string; title: string; metaTitle: string | null; content: string | null };

const isEmpty = (r: Row) => r.content === null || r.content === '';

/** In-memory Resource table honouring the filters the script uses. */
function fakePrisma(rows: Row[]) {
  const table = new Map(rows.map((r) => [r.id, { ...r }]));
  const updateMany = vi.fn(async ({ where, data }: { where: { id: string }; data: { content: string } }) => {
    const row = table.get(where.id);
    if (!row || !isEmpty(row)) return { count: 0 };
    row.content = data.content;
    return { count: 1 };
  });
  return {
    table,
    updateMany,
    prisma: {
      resource: {
        findUnique: async ({ where }: { where: { id: string } }) => table.get(where.id) ?? null,
        findMany: async () =>
          [...table.values()].filter((r) => r.metaTitle?.startsWith('WP-english-') && isEmpty(r)),
        updateMany,
      },
    },
  };
}

const wpPost = (status: string, rendered: string) =>
  ({ ok: true, status: 200, json: async () => ({ status, content: { rendered } }) }) as unknown as Response;

const stagedA = { sourceSite: 'english', wordpressPostId: 4844, title: 'Case A', content: '<p>Case A body</p>' };
const stagedB = { sourceSite: 'english', wordpressPostId: 4845, title: 'Case B', content: '<p>Case B body</p>' };
const idA = generateResourceId('english', '4844');
const idB = generateResourceId('english', '4845');

describe('backfillResourceContent', () => {
  it('dry run counts what it would fill but writes nothing', async () => {
    const { prisma, updateMany, table } = fakePrisma([{ id: idA, title: 'Case A', metaTitle: null, content: null }]);

    const { counts } = await backfillResourceContent({ prisma, staged: [stagedA], fetchImpl: vi.fn() });

    expect(counts.filled).toBe(1);
    expect(updateMany).not.toHaveBeenCalled();
    expect(table.get(idA)!.content).toBeNull();
  });

  it('fills empty rows from the staged extract and never overwrites existing content', async () => {
    const { prisma, table } = fakePrisma([
      { id: idA, title: 'Case A', metaTitle: null, content: '' },
      { id: idB, title: 'Case B', metaTitle: null, content: 'Edited by an admin' },
    ]);

    const { counts } = await backfillResourceContent({ prisma, staged: [stagedA, stagedB], apply: true, fetchImpl: vi.fn() });

    expect(counts).toMatchObject({ filled: 1, alreadyHasContent: 1 });
    expect(table.get(idA)!.content).toBe('<p>Case A body</p>');
    expect(table.get(idB)!.content).toBe('Edited by an admin');
  });

  it('reports staged posts with no matching row instead of creating them', async () => {
    const { prisma, table } = fakePrisma([]);

    const { counts, missing } = await backfillResourceContent({ prisma, staged: [stagedA], apply: true, fetchImpl: vi.fn() });

    expect(counts.missingRow).toBe(1);
    expect(missing[0]).toContain(idA);
    expect(table.size).toBe(0);
  });

  it('fills later-imported WP rows from live WordPress and leaves non-public posts empty', async () => {
    const { prisma, table } = fakePrisma([
      { id: 'live-ok', title: 'Live', metaTitle: 'WP-english-5000', content: null },
      { id: 'live-private', title: 'Private', metaTitle: 'WP-english-5001', content: null },
      { id: 'admin-note', title: 'Note', metaTitle: null, content: null },
    ]);
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes('/posts/5000')
        ? wpPost('publish', '<p>Live body</p>')
        : ({ ok: false, status: 401, json: async () => ({}) } as unknown as Response)
    );

    const { counts, liveFailures } = await backfillResourceContent({ prisma, staged: [], apply: true, fetchImpl });

    expect(counts).toMatchObject({ filledFromLiveWordPress: 1, liveWordPressFailed: 1 });
    expect(liveFailures[0]).toContain('HTTP 401');
    expect(table.get('live-ok')!.content).toBe('<p>Live body</p>');
    expect(table.get('live-private')!.content).toBeNull();
    expect(table.get('admin-note')!.content).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('is idempotent: a second apply changes nothing', async () => {
    const { prisma, updateMany } = fakePrisma([
      { id: idA, title: 'Case A', metaTitle: 'WP-english-4844', content: null },
      { id: 'live-ok', title: 'Live', metaTitle: 'WP-english-5000', content: null },
    ]);
    const fetchImpl = vi.fn(async () => wpPost('publish', '<p>Live body</p>'));

    await backfillResourceContent({ prisma, staged: [stagedA], apply: true, fetchImpl });
    updateMany.mockClear();
    const { counts } = await backfillResourceContent({ prisma, staged: [stagedA], apply: true, fetchImpl });

    expect(counts).toMatchObject({ filled: 0, alreadyHasContent: 1, filledFromLiveWordPress: 0 });
    expect(updateMany).not.toHaveBeenCalled();
  });
});
