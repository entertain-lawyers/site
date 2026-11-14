import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ 'user-agent': 'vitest' })),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    resource: { findUnique: vi.fn() },
    accessLog: { create: vi.fn() },
  },
}));
vi.mock('@/lib/b2', () => ({
  s3Client: { send: vi.fn() },
}));
vi.mock('@/env', () => ({ env: { B2_BUCKET_NAME: 'test-bucket' } }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@/lib/client-ip', () => ({ getClientIp: vi.fn().mockReturnValue('203.0.113.9') }));
vi.mock('@/modules/entitlements/entitlement.service', () => ({ canAccessResource: vi.fn() }));

import { getCurrentUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { s3Client } from '@/lib/b2';
import { canAccessResource } from '@/modules/entitlements/entitlement.service';
import { rateLimit } from '@/lib/rate-limit';
import { GET } from '../route';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;
const UUID = '4b7ba335-616f-48fc-a105-e80ac936287c';
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3, 4]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const route = () => GET(new Request(`http://localhost/api/documents/${UUID}/pdf`) as any, { params: Promise.resolve({ resourceId: UUID }) });

const entitledResource = {
  id: UUID,
  status: 'PUBLISHED',
  title: 'Proxy PDF Fixture',
  document: { id: 'doc-1', storageKey: 'documents/x/e2e.pdf' },
};

describe('GET /api/documents/[resourceId]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock(rateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 });
  });

  it('401 for signed-out visitors', async () => {
    mock(getCurrentUser).mockResolvedValue(null);
    const res = await route();
    expect(res.status).toBe(401);
  });

  it('400 for a malformed resource id', async () => {
    mock(getCurrentUser).mockResolvedValue({ id: 'user-1' });
    const res = await GET(new Request('http://localhost/api/documents/not-a-uuid/pdf') as any, {
      params: Promise.resolve({ resourceId: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
  });

  it('403 when the user has no entitlement', async () => {
    mock(getCurrentUser).mockResolvedValue({ id: 'user-1' });
    mock(prisma.resource.findUnique).mockResolvedValue(entitledResource);
    mock(canAccessResource).mockResolvedValue(false);
    const res = await route();
    expect(res.status).toBe(403);
  });

  it('streams the PDF for an entitled user and logs the view', async () => {
    mock(getCurrentUser).mockResolvedValue({ id: 'user-1' });
    mock(prisma.resource.findUnique).mockResolvedValue(entitledResource);
    mock(canAccessResource).mockResolvedValue(true);
    mock(s3Client.send).mockResolvedValue({ Body: new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(PDF); c.close(); } }) });

    const res = await route();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('inline');
    const body = await res.arrayBuffer();
    expect(new Uint8Array(body).slice(0, 4)).toEqual(PDF.slice(0, 4));
    expect(prisma.accessLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'VIEW_DOCUMENT', resourceId: UUID }) })
    );
  });

  it('404 for missing/unpublished documents', async () => {
    mock(getCurrentUser).mockResolvedValue({ id: 'user-1' });
    mock(prisma.resource.findUnique).mockResolvedValue(null);
    const res = await route();
    expect(res.status).toBe(404);
  });
});
