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
    expect(firstCall.include.author).toBeDefined();
    expect(firstCall.include.createdBy).toBeDefined();
  });

  it('gracefully falls back to explicit select fields without crashing when authorId/createdById are missing', async () => {
    let callCount = 0;
    (prisma.resource.findMany as any).mockImplementation(async (query: any) => {
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
