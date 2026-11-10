/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma, Role, ContentStatus, ResourceType } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    resource: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    semester: {
      findMany: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
    },
  },
}));
import { prisma } from '@/lib/prisma';

import AdminResourcesPage from '../page';

describe('AdminResourcesPage migration 20261101000000 fallback resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({
      user: { id: 'admin-1', role: Role.ADMIN },
    });
    (prisma.semester.findMany as any).mockResolvedValue([]);
    (prisma.subject.findMany as any).mockResolvedValue([]);
    (prisma.resource.count as any).mockResolvedValue(1);
    (prisma.resource.groupBy as any).mockResolvedValue([
      { status: ContentStatus.PUBLISHED, _count: { _all: 3 } },
      { status: ContentStatus.DRAFT, _count: { _all: 1 } },
      { status: ContentStatus.ARCHIVED, _count: { _all: 0 } },
    ]);
  });

  it('renders successfully when migration is applied and relations exist', async () => {
    (prisma.resource.findMany as any).mockResolvedValue([
      {
        id: 'res-1',
        title: 'Constitutional Law Notes',
        status: ContentStatus.PUBLISHED,
        isPremium: false,
        priceAmount: null,
        currency: 'NPR',
        type: ResourceType.LAW_NOTE,
        authorId: 'author-1',
        createdById: 'admin-1',
        author: { name: 'Advocate Sharma', email: 'sharma@example.com' },
        createdBy: { name: 'Admin', email: 'admin@example.com' },
        subject: { name: 'Constitutional Law', semester: { name: 'Semester 1' } },
        document: null,
      },
    ]);

    const result = await AdminResourcesPage({
      searchParams: Promise.resolve({}),
    });

    expect(result).toBeDefined();
    expect(prisma.resource.findMany).toHaveBeenCalledTimes(1);
    const firstCall = (prisma.resource.findMany as any).mock.calls[0][0];
    const authorInclude = firstCall.include.User_Resource_authorIdToUser ?? firstCall.include.author;
    const createdByInclude = firstCall.include.User_Resource_createdByIdToUser ?? firstCall.include.createdBy;
    expect(authorInclude).toBeDefined();
    expect(createdByInclude).toBeDefined();
  });

  it('gracefully falls back to explicit select fields without crashing when authorId/createdById are missing', async () => {
    let callCount = 0;
    (prisma.resource.findMany as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
          code: 'P2022',
          clientVersion: 'test',
          meta: { column: 'Resource.authorId' },
        });
      }
      return [
        {
          id: 'res-1',
          title: 'Constitutional Law Notes',
          status: ContentStatus.PUBLISHED,
          isPremium: false,
          priceAmount: null,
          currency: 'NPR',
          content: null,
          documentId: null,
          document: null,
          subject: { name: 'Constitutional Law', semester: { name: 'Semester 1' } },
        },
      ];
    });

    const result = await AdminResourcesPage({
      searchParams: Promise.resolve({}),
    });

    expect(result).toBeDefined();
    expect(callCount).toBe(2);

    // Second call must use explicit select without author/createdBy
    const secondCall = (prisma.resource.findMany as any).mock.calls[1][0];
    expect(secondCall.select).toBeDefined();
    expect(secondCall.select.id).toBe(true);
    expect(secondCall.select.type).toBe(true);
    expect(secondCall.select.authorId).toBeUndefined();
    expect(secondCall.select.createdById).toBeUndefined();
    expect(secondCall.select.author).toBeUndefined();
    expect(secondCall.select.createdBy).toBeUndefined();
  });

  it('re-throws unrelated database errors from findMany', async () => {
    (prisma.resource.findMany as any).mockRejectedValue(new Error('Connection lost to PostgreSQL'));

    await expect(
      AdminResourcesPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('Connection lost to PostgreSQL');
  });

  it('re-throws P2022 if error is caused by an unrelated column', async () => {
    (prisma.resource.findMany as any).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('column Resource.otherField does not exist', {
        code: 'P2022',
        clientVersion: 'test',
        meta: { column: 'Resource.otherField' },
      })
    );

    await expect(
      AdminResourcesPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow(/otherField/);
  });
});

describe('AdminResourcesPage server-side search, filters and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({
      user: { id: 'admin-1', role: Role.ADMIN },
    });
    (prisma.semester.findMany as any).mockResolvedValue([{ id: 'sem-1', name: 'Semester 1' }]);
    (prisma.subject.findMany as any).mockResolvedValue([{ id: 'sub-1', name: 'Constitutional Law', semesterId: 'sem-1' }]);
    (prisma.resource.groupBy as any).mockResolvedValue([]);
    (prisma.resource.count as any).mockResolvedValue(25);
    (prisma.resource.findMany as any).mockResolvedValue([]);
  });

  it('applies the search term to title, subject, and author/creator fields', async () => {
    await AdminResourcesPage({ searchParams: Promise.resolve({ q: 'constitution' }) });

    const findCall = (prisma.resource.findMany as any).mock.calls[0][0];
    const searchLayer = findCall.where.AND.find(
      (layer: { OR?: unknown[] }) => Array.isArray(layer.OR)
    );
    expect(searchLayer).toBeDefined();
    expect(searchLayer.OR).toHaveLength(4);
    expect(JSON.stringify(searchLayer.OR)).toContain('constitution');

    const countCall = (prisma.resource.count as any).mock.calls[0][0];
    expect(countCall.where).toEqual(findCall.where);
  });

  it('narrow-scope counts (status tabs) ignore the transient search filters', async () => {
    await AdminResourcesPage({ searchParams: Promise.resolve({ q: 'constitution', status: 'draft' }) });

    const groupByCall = (prisma.resource.groupBy as any).mock.calls[0][0];
    expect(groupByCall.where).toEqual({});
  });

  it('slices results into pages of 20 and clamps to the last page', async () => {
    (prisma.resource.count as any).mockResolvedValue(205);
    await AdminResourcesPage({ searchParams: Promise.resolve({ page: '3' }) });

    const findCall = (prisma.resource.findMany as any).mock.calls[0][0];
    expect(findCall.take).toBe(21);
    expect(findCall.skip).toBe(40);
    const metadata = await AdminResourcesPage({ searchParams: Promise.resolve({ page: '30' }) });
    expect(metadata).toBeDefined();
    const second = (prisma.resource.findMany as any).mock.calls[1][0];
    // Page beyond the result set clamps to the last page (11 pages for 205 items).
    expect(second.skip).toBe(200);
  });

  it('filters by semester and subject ids', async () => {
    await AdminResourcesPage({ searchParams: Promise.resolve({ semester: 'sem-1', subject: 'sub-1' }) });

    const findCall = (prisma.resource.findMany as any).mock.calls[0][0];
    const whereJson = JSON.stringify(findCall.where);
    expect(whereJson).toContain('sem-1');
    expect(whereJson).toContain('sub-1');
  });

  it('passes the requested type filter through and orders drafts by recent updates', async () => {
    await AdminResourcesPage({ searchParams: Promise.resolve({ type: 'CASE_LAW', status: 'draft' }) });

    const findCall = (prisma.resource.findMany as any).mock.calls[0][0];
    expect(JSON.stringify(findCall.where)).toContain('CASE_LAW');
    expect(findCall.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('orders published/all resources by recency (createdAt: desc) instead of alphabetically', async () => {
    await AdminResourcesPage({ searchParams: Promise.resolve({}) });

    const findCall = (prisma.resource.findMany as any).mock.calls[0][0];
    expect(findCall.orderBy).toEqual({ createdAt: 'desc' });
  });
});
