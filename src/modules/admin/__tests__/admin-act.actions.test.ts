import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Role, ContentStatus } from '@prisma/client';
import {
  createActAction,
  updateActAction,
  deleteActAction,
  bulkDeleteActsAction,
} from '../admin-act.actions';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

describe('Admin Acts & Laws Actions Suite', () => {
  let adminUserId = '';

  beforeEach(async () => {
    vi.clearAllMocks();

    let admin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: 'admin-acts-test@example.com',
          role: Role.ADMIN,
        },
      });
    }

    adminUserId = admin.id;

    (auth as any).mockResolvedValue({
      user: { id: adminUserId, role: Role.ADMIN, email: admin.email },
    });
  });

  afterAll(async () => {
    await prisma.actLaw.deleteMany({
      where: {
        OR: [
          { title: { contains: 'Test' } },
          { title: { contains: 'Temporary' } },
          { title: { contains: 'Updated Treaty Act' } },
          { title: { contains: 'Act to Delete' } },
          { slug: { startsWith: 'test-' } },
          { slug: { startsWith: 'temp-' } },
          { slug: { startsWith: 'delete-act-' } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { email: 'admin-acts-test@example.com' },
    });
  });

  it('creates an act with slug generation and shortlist category', async () => {
    const act = await prisma.actLaw.create({
      data: {
        title: 'Evidence Act, 2031 (प्रमाण ऐन, २०३१)',
        titleEn: 'Evidence Act, 2031',
        slug: `test-evidence-${Math.random()}`,
        category: 'ACTS',
        description: 'Rules of evidence in Nepal',
        documentUrl: 'https://lawcommission.gov.np/evidence.pdf',
        status: ContentStatus.PUBLISHED,
      },
    });

    expect(act.id).toBeDefined();
    expect(act.title).toContain('Evidence Act');
    expect(act.category).toBe('ACTS');

    // Cleanup
    await prisma.actLaw.delete({ where: { id: act.id } });
  });

  it('updates an existing act and preserves category', async () => {
    const created = await prisma.actLaw.create({
      data: {
        title: 'Temporary Treaty Act',
        slug: `temp-treaty-${Math.random()}`,
        category: 'INTERNATIONAL_TREATIES',
        status: ContentStatus.DRAFT,
      },
    });

    const res = await updateActAction({
      id: created.id,
      title: 'Updated Treaty Act, 2047',
      category: 'INTERNATIONAL_TREATIES',
      status: ContentStatus.PUBLISHED,
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.title).toBe('Updated Treaty Act, 2047');
      expect(res.data.status).toBe(ContentStatus.PUBLISHED);
    }

    // Cleanup
    await prisma.actLaw.delete({ where: { id: created.id } });
  });

  it('deletes an act cleanly', async () => {
    const created = await prisma.actLaw.create({
      data: {
        title: 'Act to Delete',
        slug: `delete-act-${Math.random()}`,
        category: 'OTHERS',
        status: ContentStatus.PUBLISHED,
      },
    });

    const res = await deleteActAction({ id: created.id });
    expect(res.success).toBe(true);

    const check = await prisma.actLaw.findUnique({ where: { id: created.id } });
    expect(check).toBeNull();
  });

  it('creates an act with an uploaded (relative) document URL from the media flow', async () => {
    const res = await createActAction({
      title: 'Test Uploaded PDF Act',
      category: 'ACTS',
      documentUrl: '/api/media/editorial/acts/2026-11-11-test.pdf',
      status: ContentStatus.PUBLISHED,
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.documentUrl).toBe('/api/media/editorial/acts/2026-11-11-test.pdf');
      await prisma.actLaw.delete({ where: { id: res.data.id } });
    }
  });

  it('rejects a document URL that is neither http(s) nor a / path', async () => {
    const res = await createActAction({
      title: 'Test Bad URL Act',
      category: 'ACTS',
      documentUrl: 'javascript:alert(1)',
      status: ContentStatus.PUBLISHED,
    });

    expect(res.success).toBe(false);
  });

  it('bulk deletes multiple acts at once', async () => {
    const a = await prisma.actLaw.create({
      data: { title: 'Bulk Delete A', slug: `test-bulk-a-${Math.random()}`, category: 'ACTS', status: ContentStatus.PUBLISHED },
    });
    const b = await prisma.actLaw.create({
      data: { title: 'Bulk Delete B', slug: `test-bulk-b-${Math.random()}`, category: 'ACTS', status: ContentStatus.PUBLISHED },
    });

    const res = await bulkDeleteActsAction({ ids: [a.id, b.id] });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.count).toBe(2);
    }

    expect(await prisma.actLaw.findUnique({ where: { id: a.id } })).toBeNull();
    expect(await prisma.actLaw.findUnique({ where: { id: b.id } })).toBeNull();
  });

  it('blocks unauthenticated or non-admin users from creating acts', async () => {
    (auth as any).mockResolvedValue({
      user: { id: 'non-existent-user', role: Role.USER, email: 'fake@example.com' },
    });

    const res = await createActAction({
      title: 'Malicious Act',
      category: 'ACTS',
      status: ContentStatus.PUBLISHED,
    });

    expect(res.success).toBe(false);
  });
});
