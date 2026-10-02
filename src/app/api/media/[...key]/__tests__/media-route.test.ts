import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the B2 functions
vi.mock('@/lib/b2', () => ({
  generatePresignedGetUrl: vi.fn().mockResolvedValue('https://mocked-b2-url.com/presigned')
}));

describe('Public Media Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (path: string) => {
    return new NextRequest(`http://localhost:3000/api/media/${path}`);
  };

  it('A. Public key: editorial/example.jpg -> allowed', async () => {
    const request = createRequest('editorial/example.jpg');
    const response = await GET(request, { params: Promise.resolve({ key: ['editorial', 'example.jpg'] }) });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://mocked-b2-url.com/presigned');
    expect(response.headers.get('cache-control')).toContain('max-age=1800');
  });

  it('B. Public key: gallery/example.jpg -> allowed', async () => {
    const request = createRequest('gallery/example.jpg');
    const response = await GET(request, { params: Promise.resolve({ key: ['gallery', 'example.jpg'] }) });

    expect(response.status).toBe(302);
  });

  it('C. Public key: publications/example.jpg -> allowed', async () => {
    const request = createRequest('publications/example.jpg');
    const response = await GET(request, { params: Promise.resolve({ key: ['publications', 'example.jpg'] }) });

    expect(response.status).toBe(302);
  });

  it('D. Private key: documents/example.pdf -> rejected (403)', async () => {
    const request = createRequest('documents/example.pdf');
    const response = await GET(request, { params: Promise.resolve({ key: ['documents', 'example.pdf'] }) });

    expect(response.status).toBe(403);
  });

  it('E. Unknown key: random/example.jpg -> rejected (403)', async () => {
    const request = createRequest('random/example.jpg');
    const response = await GET(request, { params: Promise.resolve({ key: ['random', 'example.jpg'] }) });

    expect(response.status).toBe(403);
  });

  it('F. Path manipulation attempts -> rejected', async () => {
    const request = createRequest('editorial/../documents/example.pdf');
    const response = await GET(request, { params: Promise.resolve({ key: ['editorial', '..', 'documents', 'example.pdf'] }) });

    expect(response.status).toBe(403);
  });
});
