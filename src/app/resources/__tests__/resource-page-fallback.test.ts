/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock entitlement
vi.mock('@/modules/entitlements/entitlement.service', () => ({
  canAccessResource: vi.fn().mockResolvedValue(true),
  requiresSignIn: vi.fn().mockReturnValue(false),
}));

// Mock seo
vi.mock('@/lib/seo', () => ({
  serializeJsonLd: vi.fn().mockReturnValue('{}'),
  getSiteUrl: vi.fn().mockReturnValue('https://entertainlawyers.com'),
}));

// Mock i18n & components
vi.mock('@/lib/i18n', () => ({ getDictionary: vi.fn(async () => new Proxy({}, { get: (_t, k) => String(k) })) }));
vi.mock('@/components/payments/CheckoutButtons', () => ({ CheckoutButtons: () => null }));
vi.mock('@/components/SecurePdfViewer', () => ({ default: () => null }));
vi.mock('@/components/study/StudyOutlineSidebar', () => ({ default: () => null }));
vi.mock('@/components/posts/ArticleBody', () => ({ default: () => null }));
vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_APP_URL: 'https://example.test', PAYMENTS_ENABLED: 'false' } }));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    resource: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));
import { prisma } from '@/lib/prisma';

import ResourcePage from '../[id]/page';
import ReadResourcePage from '../../read/[resourceId]/page';

describe('ResourcePage and ReadResourcePage migration 20261101000000 fallback resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('ResourcePage gracefully falls back when authorId/createdById are missing without crashing', async () => {
    let callCount = 0;
    (prisma.resource.findUnique as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
          code: 'P2022',
          clientVersion: 'test',
          meta: { column: 'Resource.authorId' },
        });
      }
      return {
        id: 'res-pub-1',
        title: 'Public Law Notes',
        status: 'PUBLISHED',
        type: 'LAW_NOTE',
        subjectId: 'sub-1',
        unitId: null,
        isPremium: false,
        priceAmount: null,
        currency: 'NPR',
        documentId: null,
        // Nothing readable yet: the entitled-user redirect must not fire here,
        // so this fixture stays on the detail page (PDF Coming Soon).
        content: '',
        subject: { id: 'sub-1', name: 'Law', semester: { name: 'Sem 1' }, semesterId: 'sem-1' },
        unit: null,
      };
    });

    const result = await ResourcePage({
      params: Promise.resolve({ id: 'res-pub-1' }),
    });

    expect(result).toBeDefined();
    expect(callCount).toBe(2);

    const secondCall = (prisma.resource.findUnique as any).mock.calls[1][0];
    expect(secondCall.select).toBeDefined();
    expect(secondCall.select.authorId).toBeUndefined();
    expect(secondCall.select.createdById).toBeUndefined();
  });

  it('ReadResourcePage gracefully falls back when authorId/createdById are missing without crashing', async () => {
    let callCount = 0;
    (prisma.resource.findUnique as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Prisma.PrismaClientKnownRequestError('column Resource.authorId does not exist', {
          code: 'P2022',
          clientVersion: 'test',
          meta: { column: 'Resource.authorId' },
        });
      }
      return {
        id: 'res-read-1',
        title: 'Read Law Notes',
        status: 'PUBLISHED',
        type: 'LAW_NOTE',
        subjectId: 'sub-1',
        unitId: null,
        documentId: null,
        document: null,
        content: '<p>Content</p>',
        unit: null,
        subject: { id: 'sub-1', name: 'Law', semester: { name: 'Sem 1' }, semesterId: 'sem-1', units: [] },
      };
    });

    const result = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'res-read-1' }),
    });

    expect(result).toBeDefined();
    expect(callCount).toBe(2);

    const secondCall = (prisma.resource.findUnique as any).mock.calls[1][0];
    expect(secondCall.select).toBeDefined();
    expect(secondCall.select.authorId).toBeUndefined();
    expect(secondCall.select.createdById).toBeUndefined();
  });

  it('ResourcePage re-throws unrelated database errors', async () => {
    (prisma.resource.findUnique as any).mockRejectedValue(new Error('Connection terminated unexpectedly'));

    await expect(
      ResourcePage({
        params: Promise.resolve({ id: 'res-pub-1' }),
      })
    ).rejects.toThrow('Connection terminated unexpectedly');
  });

  it('ResourcePage re-throws P2022 when an unrelated column is missing', async () => {
    (prisma.resource.findUnique as any).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('column Resource.unrelatedField does not exist', {
        code: 'P2022',
        clientVersion: 'test',
        meta: { column: 'Resource.unrelatedField' },
      })
    );

    await expect(
      ResourcePage({
        params: Promise.resolve({ id: 'res-pub-1' }),
      })
    ).rejects.toThrow(/unrelatedField/);
  });

  it('ReadResourcePage re-throws unrelated database errors', async () => {
    (prisma.resource.findUnique as any).mockRejectedValue(new Error('Connection terminated unexpectedly'));

    await expect(
      ReadResourcePage({
        params: Promise.resolve({ resourceId: 'res-read-1' }),
      })
    ).rejects.toThrow('Connection terminated unexpectedly');
  });

  it('ReadResourcePage re-throws P2022 when an unrelated column is missing', async () => {
    (prisma.resource.findUnique as any).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('column Resource.unrelatedField does not exist', {
        code: 'P2022',
        clientVersion: 'test',
        meta: { column: 'Resource.unrelatedField' },
      })
    );

    await expect(
      ReadResourcePage({
        params: Promise.resolve({ resourceId: 'res-read-1' }),
      })
    ).rejects.toThrow(/unrelatedField/);
  });
});
