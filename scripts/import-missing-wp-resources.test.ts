import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { importMissingWpResources } = require('./import-missing-wp-resources.js');
const { generateResourceId } = require('../scripts-recovered/migration-identity.js');

type Created = { id: string; status: string; subjectId: string | null; metaTitle: string; content: string; type: string };

const subjects = [
  { id: 'sub-banking', name: 'Banking and Insurance Law', semester: { name: '7th Semester' } },
  { id: 'sub-banking-9', name: 'Law of Banking and Negotiable Instruments', semester: { name: '9th Semester' } },
  { id: 'sub-gender', name: 'Gender and Inclusive Justice', semester: { name: '8th Semester' } },
  { id: 'sub-family', name: 'Family Law', semester: { name: '4th Semester' } },
  { id: 'sub-labor-5', name: 'Labor Law', semester: { name: '5th Semester' } },
  { id: 'sub-labour-7', name: 'Labour Law', semester: { name: '7th Semester' } },
];

const categories = [
  { id: 58, name: 'News' },
  { id: 104, name: 'Civil' },
  { id: 106, name: 'Writs' },
  { id: 122, name: 'Family Law' },
  { id: 123, name: 'Contract Law-I' },
  { id: 139, name: 'Law of Banking and Negotiable Instruments' },
  { id: 151, name: 'Gender and Inclusive Justice' },
  { id: 160, name: 'Labour Law' },
];

const mappingFile = {
  subjectMappings: [
    { wpCategoryId: 139, proposedSemester: '7th Semester', proposedSubject: 'Banking and Insurance Law', humanDecision: 'Approved' },
    { wpCategoryId: 122, proposedSemester: 'UNRESOLVED', proposedSubject: 'UNRESOLVED', humanDecision: 'Per-resource classification required' },
    { wpCategoryId: 104, proposedSemester: 'UNRESOLVED', proposedSubject: 'UNRESOLVED', humanDecision: 'Leave Subject null' },
  ],
};

const post = (id: number, title: string, cats: number[]) => ({
  id,
  slug: `post-${id}`,
  status: 'publish',
  title: { rendered: title },
  categories: cats,
  content: { rendered: `<p>${title} body</p>` },
});

const posts = [
  post(1, 'Court news item', [58]), // live-routed article: never a Resource
  post(2, 'Banking Law Case: A vs. B, NKP', [139, 106]), // approved mapping
  post(3, 'Gender and Inclusive Justice Case: C vs. D, NKP', [151, 106]), // exact category-name match
  post(4, 'Family Law Case: E vs. F, NKP', [122, 104]), // unresolved category
  post(5, 'Contract Law Case: G vs. H, NKP', [123]), // no subject with that name
  post(6, 'Labour Law Case: I vs. J, NKP', [160]), // two subjects match the name
  post(7, 'Already imported, NKP case', [151]), // deterministic id exists
  post(8, 'Imported by metaTitle, NKP case', [151]), // metaTitle exists
];

function setup() {
  const rows = new Map<string, Created>();
  rows.set(generateResourceId('english', '7'), { id: generateResourceId('english', '7') } as Created);
  rows.set('legacy-uuid', { id: 'legacy-uuid', metaTitle: 'WP-english-8' } as Created);

  const create = vi.fn(async ({ data }: { data: Created }) => {
    if (rows.has(data.id)) throw new Error('Unique constraint failed on the fields: (`id`)');
    rows.set(data.id, data);
    return data;
  });
  const prisma = {
    subject: { findMany: async () => subjects },
    resource: {
      findFirst: async ({ where }: { where: { OR: [{ id: string }, { metaTitle: string }] } }) => {
        const [{ id }, { metaTitle }] = where.OR;
        return [...rows.values()].find((r) => r.id === id || r.metaTitle === metaTitle) ?? null;
      },
      create,
    },
  };
  const json = (body: unknown) =>
    ({ ok: true, status: 200, json: async () => body, headers: new Headers({ 'x-wp-totalpages': '1' }) }) as unknown as Response;
  const fetchImpl = vi.fn(async (url: string) => json(url.includes('/categories') ? categories : posts));
  return { prisma, fetchImpl, create, rows };
}

const byWpId = (plan: Array<{ wpId: number }>) => new Map(plan.map((p) => [p.wpId, p]));

describe('importMissingWpResources', () => {
  it('dry run plans the missing study posts and creates nothing', async () => {
    const { prisma, fetchImpl, create } = setup();

    const { postCount, plan } = await importMissingWpResources({ prisma, fetchImpl, mappingFile });

    expect(postCount).toBe(8);
    expect(plan.map((p: { wpId: number }) => p.wpId).sort()).toEqual([2, 3, 4, 5, 6]);
    expect(create).not.toHaveBeenCalled();
  });

  it('skips live-routed articles and rows that already exist by id or metaTitle', async () => {
    const { prisma, fetchImpl } = setup();

    const plan = byWpId((await importMissingWpResources({ prisma, fetchImpl, mappingFile })).plan);

    expect(plan.has(1)).toBe(false);
    expect(plan.has(7)).toBe(false);
    expect(plan.has(8)).toBe(false);
  });

  it('publishes only posts with a safe subject; uncertain ones stay DRAFT without a subject', async () => {
    const { prisma, fetchImpl } = setup();

    const plan = byWpId((await importMissingWpResources({ prisma, fetchImpl, mappingFile })).plan);

    // Approved mapping wins over the same-named 9th-semester subject.
    expect(plan.get(2)).toMatchObject({ status: 'PUBLISHED', subjectId: 'sub-banking', type: 'CASE_LAW' });
    expect(plan.get(3)).toMatchObject({ status: 'PUBLISHED', subjectId: 'sub-gender' });
    // Unresolved in review, even though a "Family Law" subject exists.
    expect(plan.get(4)).toMatchObject({ status: 'DRAFT', subjectId: null });
    expect(plan.get(5)).toMatchObject({ status: 'DRAFT', subjectId: null, via: 'no matching subject' });
    expect(plan.get(6)).toMatchObject({ status: 'DRAFT', subjectId: null, via: 'ambiguous (2 subjects)' });
  });

  it('creates rows with deterministic ids and WordPress provenance, and is idempotent', async () => {
    const { prisma, fetchImpl, create, rows } = setup();

    await importMissingWpResources({ prisma, fetchImpl, mappingFile, apply: true });
    expect(create).toHaveBeenCalledTimes(5);
    const banking = rows.get(generateResourceId('english', '2'))!;
    expect(banking).toMatchObject({ metaTitle: 'WP-english-2', content: '<p>Banking Law Case: A vs. B, NKP body</p>' });

    create.mockClear();
    const second = await importMissingWpResources({ prisma, fetchImpl, mappingFile, apply: true });
    expect(second.plan).toHaveLength(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('fails loudly instead of importing a partial list when WordPress errors', async () => {
    const { prisma, create } = setup();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response);

    await expect(importMissingWpResources({ prisma, fetchImpl, mappingFile, apply: true })).rejects.toThrow('HTTP 503');
    expect(create).not.toHaveBeenCalled();
  });
});
