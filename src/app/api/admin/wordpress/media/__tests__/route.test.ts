import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Role } from '@prisma/client';

vi.mock('@/lib/api-auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { auditLog: { create: vi.fn() } } }));
// Real write-block logic and error classes; only the network upload is faked.
vi.mock('@/lib/wordpress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wordpress')>()),
  uploadWordPressMedia: vi.fn(),
}));

import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { uploadWordPressMedia, WordPressApiError, WordPressAuthError } from '@/lib/wordpress';
import { WP_MEDIA_MAX_BYTES } from '@/lib/wordpress-media';
import { POST } from '../route';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

const wpMedia = {
  id: 77,
  date: '2026-10-31T10:00:00',
  slug: 'notice',
  link: '',
  title: { rendered: 'Notice' },
  author: 1,
  source_url: 'https://www.entertainlawyers.com/wp-content/uploads/2026/10/notice.png',
  mime_type: 'image/png',
  media_details: { width: 800, height: 600, file: '2026/10/notice.png', sizes: {} },
};

function uploadRequest({
  bytes = PNG,
  type = 'image/png',
  name = 'Notice.png',
  lang = 'en',
  origin = 'https://entertainlawyers.vercel.app',
}: { bytes?: Uint8Array; type?: string; name?: string; lang?: string; origin?: string | null } = {}) {
  const form = new FormData();
  form.append('file', new File([bytes as BlobPart], name, { type }));
  form.append('lang', lang);
  form.append('title', 'Notice');
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return new Request('https://entertainlawyers.vercel.app/api/admin/wordpress/media', { method: 'POST', body: form, headers });
}

describe('POST /api/admin/wordpress/media', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, WP_AUTH_USERNAME: 'entertainlawyers-api', WP_AUTH_APP_PASSWORD: 'secret pass word' };
    delete process.env.VERCEL_ENV;
    delete process.env.WP_READ_ONLY;
    mock(requireRole).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN });
    mock(uploadWordPressMedia).mockResolvedValue(wpMedia);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects anonymous users and non-editors', async () => {
    mock(requireRole).mockResolvedValue(null);
    const res = await POST(uploadRequest());
    expect(res.status).toBe(401);
    expect(uploadWordPressMedia).not.toHaveBeenCalled();
  });

  it('rejects cross-site requests', async () => {
    const res = await POST(uploadRequest({ origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(uploadWordPressMedia).not.toHaveBeenCalled();
  });

  it('respects the Preview and read-only write protection', async () => {
    process.env.VERCEL_ENV = 'preview';
    let res = await POST(uploadRequest());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Preview/);

    delete process.env.VERCEL_ENV;
    process.env.WP_READ_ONLY = 'true';
    res = await POST(uploadRequest());
    expect(res.status).toBe(403);
    expect(uploadWordPressMedia).not.toHaveBeenCalled();
  });

  it('reports missing credentials before reading the upload', async () => {
    delete process.env.WP_AUTH_APP_PASSWORD;
    const res = await POST(uploadRequest());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/no WordPress credentials/);
  });

  it('validates language, type, size and the real file signature on the server', async () => {
    expect((await POST(uploadRequest({ lang: 'fr' }))).status).toBe(400);
    expect((await POST(uploadRequest({ type: 'image/svg+xml', name: 'x.svg' }))).status).toBe(415);

    const big = new Uint8Array(WP_MEDIA_MAX_BYTES + 1);
    big.set(PNG);
    expect((await POST(uploadRequest({ bytes: big }))).status).toBe(413);

    // Declared PNG, actually a script.
    const fake = await POST(uploadRequest({ bytes: new TextEncoder().encode('<script>alert(1)</script>') }));
    expect(fake.status).toBe(415);
    expect((await fake.json()).error).toMatch(/not a valid JPEG, PNG, WebP or GIF/);

    // A real PNG labelled as JPEG.
    const mismatch = await POST(uploadRequest({ type: 'image/jpeg', name: 'x.jpg' }));
    expect(mismatch.status).toBe(415);
    expect(uploadWordPressMedia).not.toHaveBeenCalled();
  });

  it('uploads to the requested library and returns only browser-safe fields', async () => {
    const res = await POST(uploadRequest({ lang: 'ne', name: 'Court Notice.png' }));

    expect(res.status).toBe(201);
    expect(uploadWordPressMedia).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'court-notice.png', mimeType: 'image/png', title: 'Notice' }),
      'ne'
    );
    const body = await res.json();
    expect(body.item).toMatchObject({ id: 77, url: wpMedia.source_url, filename: 'notice.png' });
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('secret');
    expect(raw).not.toContain('Basic ');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entityType: 'MEDIA_WP', entityId: '77' }) })
    );
  });

  it('maps WordPress failures to clear errors', async () => {
    mock(uploadWordPressMedia).mockRejectedValueOnce(new WordPressApiError('nope', 403, '/media', { code: 'rest_cannot_create' }));
    let res = await POST(uploadRequest());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/upload_files/);

    mock(uploadWordPressMedia).mockRejectedValueOnce(new WordPressApiError('timeout', 408, '/media'));
    res = await POST(uploadRequest());
    expect(res.status).toBe(504);

    mock(uploadWordPressMedia).mockRejectedValueOnce(new WordPressApiError('too big', 413, '/media'));
    expect((await POST(uploadRequest())).status).toBe(413);

    mock(uploadWordPressMedia).mockRejectedValueOnce(new WordPressAuthError());
    expect((await POST(uploadRequest())).status).toBe(503);

    mock(uploadWordPressMedia).mockRejectedValueOnce(new WordPressApiError('Bad Gateway', 502, '/media'));
    res = await POST(uploadRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/could not store the image/);
  });
});
