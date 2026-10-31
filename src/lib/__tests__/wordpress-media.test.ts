import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeUploadFilename,
  sniffImageMimeType,
  toFeaturedImageSelection,
  toWordPressMediaItem,
  validateImageFile,
  WP_MEDIA_MAX_BYTES,
} from '../wordpress-media';
import {
  getWordPressMediaById,
  getWordPressWriteBlock,
  listWordPressMedia,
  uploadWordPressMedia,
  WordPressApiError,
  WordPressAuthError,
  type WordPressMedia,
} from '../wordpress';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const GIF = new TextEncoder().encode('GIF89a......');
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

const media: WordPressMedia = {
  id: 321,
  date: '2026-10-31T10:00:00',
  slug: 'court-notice',
  link: 'https://www.entertainlawyers.com/court-notice/',
  title: { rendered: 'Court &amp; Notice' },
  author: 7,
  source_url: 'https://www.entertainlawyers.com/wp-content/uploads/2026/10/court-notice.jpg',
  mime_type: 'image/jpeg',
  media_details: {
    width: 1200,
    height: 630,
    file: '2026/10/court-notice.jpg',
    sizes: {
      medium: { source_url: 'https://www.entertainlawyers.com/wp-content/uploads/2026/10/court-notice-300x158.jpg', width: 300, height: 158 },
    },
  },
};

const json = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });

describe('featured image file rules', () => {
  it('accepts JPEG, PNG, WebP and GIF within the size limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(validateImageFile({ type, size: 1024 })).toBeNull();
    }
  });

  it('rejects other types, empty files and files over the limit', () => {
    expect(validateImageFile({ type: 'image/svg+xml', size: 10 })).toMatch(/Only JPEG, PNG, WebP and GIF/);
    expect(validateImageFile({ type: 'application/pdf', size: 10 })).toMatch(/Only JPEG/);
    expect(validateImageFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
    expect(validateImageFile({ type: 'image/png', size: WP_MEDIA_MAX_BYTES + 1 })).toMatch(/limit is 4\.0 MB/);
  });

  it('identifies formats from their bytes, not their names', () => {
    expect(sniffImageMimeType(PNG)).toBe('image/png');
    expect(sniffImageMimeType(JPEG)).toBe('image/jpeg');
    expect(sniffImageMimeType(GIF)).toBe('image/gif');
    expect(sniffImageMimeType(WEBP)).toBe('image/webp');
    expect(sniffImageMimeType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffImageMimeType(new TextEncoder().encode('%PDF-1.7'))).toBeNull();
  });

  it('makes a safe filename with an extension matching the real format', () => {
    expect(safeUploadFilename('C:\\Users\\me\\Court Notice (final).PNG', 'image/png')).toBe('court-notice-final.png');
    expect(safeUploadFilename('../../etc/passwd.jpg', 'image/jpeg')).toBe('passwd.jpg');
    expect(safeUploadFilename('photo.jpg', 'image/webp')).toBe('photo.webp');
    expect(safeUploadFilename('सूचना.jpg', 'image/jpeg')).toBe('featured-image.jpg');
  });

  it('maps a WordPress media record to the fields the editor needs, nothing more', () => {
    const item = toWordPressMediaItem(media);
    expect(item).toEqual({
      id: 321,
      title: 'Court & Notice',
      filename: 'court-notice.jpg',
      url: media.source_url,
      thumbnailUrl: 'https://www.entertainlawyers.com/wp-content/uploads/2026/10/court-notice-300x158.jpg',
      width: 1200,
      height: 630,
      mimeType: 'image/jpeg',
    });
    expect(toFeaturedImageSelection(item, 'ne')).toMatchObject({ id: 321, lang: 'ne', url: media.source_url });
  });
});

describe('WordPress media client', () => {
  const originalEnv = process.env;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env = { ...originalEnv, WP_AUTH_USERNAME: 'entertainlawyers-api', WP_AUTH_APP_PASSWORD: 'abcd efgh' };
    delete process.env.WP_AUTH_HEADER;
    delete process.env.VERCEL_ENV;
    delete process.env.WP_READ_ONLY;
    delete process.env.WP_ENGLISH_URL;
    delete process.env.WP_NEPALI_URL;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  const expectedAuth = `Basic ${Buffer.from('entertainlawyers-api:abcd efgh').toString('base64')}`;

  it('lists images from the Nepali library, authenticated, uncached, with search and paging', async () => {
    fetchMock.mockResolvedValue(json([media], { headers: { 'X-WP-Total': '30', 'X-WP-TotalPages': '2' } }));

    const result = await listWordPressMedia({ lang: 'ne', page: 2, search: ' notice ' });

    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://entertainlawyers.com/nepali/wp-json/wp/v2/media');
    expect(parsed.searchParams.get('media_type')).toBe('image');
    expect(parsed.searchParams.get('search')).toBe('notice');
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(init.headers.Authorization).toBe(expectedAuth);
    expect(init.cache).toBe('no-store');
    expect(result).toMatchObject({ total: 30, totalPages: 2, page: 2 });
  });

  it('lists public media without credentials when none are configured', async () => {
    delete process.env.WP_AUTH_USERNAME;
    delete process.env.WP_AUTH_APP_PASSWORD;
    fetchMock.mockResolvedValue(json([media]));

    await listWordPressMedia({ lang: 'en' });

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('raises list failures instead of returning an empty library', async () => {
    fetchMock.mockResolvedValue(json({ code: 'rest_forbidden' }, { status: 403 }));
    await expect(listWordPressMedia({ lang: 'en' })).rejects.toMatchObject({ status: 403 });
  });

  it('fetches one media item with credentials when asked, and returns null when it is gone', async () => {
    fetchMock.mockResolvedValueOnce(json(media));
    expect(await getWordPressMediaById(321, 'en', { authenticated: true })).toMatchObject({ id: 321 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(expectedAuth);

    fetchMock.mockResolvedValueOnce(json({ code: 'rest_post_invalid_id' }, { status: 404 }));
    expect(await getWordPressMediaById(999, 'en')).toBeNull();
  });

  it('uploads the bytes to the right library with the server credentials and sets the title', async () => {
    fetchMock.mockResolvedValueOnce(json(media, { status: 201 })).mockResolvedValueOnce(json({ ...media, title: { rendered: 'Court notice' } }));

    const uploaded = await uploadWordPressMedia({ bytes: PNG, filename: 'court-notice.png', mimeType: 'image/png', title: 'Court notice' }, 'ne');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://entertainlawyers.com/nepali/wp-json/wp/v2/media');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('image/png');
    expect(init.headers['Content-Disposition']).toBe('attachment; filename="court-notice.png"');
    expect(init.headers.Authorization).toBe(expectedAuth);
    expect(init.body).toBe(PNG);
    expect(fetchMock.mock.calls[1][0]).toBe('https://entertainlawyers.com/nepali/wp-json/wp/v2/media/321');
    expect(uploaded.title.rendered).toBe('Court notice');
  });

  it('strips quotes and line breaks from the filename header', async () => {
    fetchMock.mockResolvedValueOnce(json(media, { status: 201 }));
    await uploadWordPressMedia({ bytes: PNG, filename: 'a"b\r\nX-Evil: 1.png', mimeType: 'image/png' });
    expect(fetchMock.mock.calls[0][1].headers['Content-Disposition']).toBe('attachment; filename="abX-Evil: 1.png"');
  });

  it('refuses to upload without credentials and never calls WordPress', async () => {
    delete process.env.WP_AUTH_USERNAME;
    delete process.env.WP_AUTH_APP_PASSWORD;
    await expect(uploadWordPressMedia({ bytes: PNG, filename: 'x.png', mimeType: 'image/png' })).rejects.toBeInstanceOf(WordPressAuthError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports WordPress permission errors and timeouts with their status', async () => {
    fetchMock.mockResolvedValueOnce(json({ code: 'rest_cannot_create', message: 'Sorry, you are not allowed to upload files.' }, { status: 403 }));
    await expect(uploadWordPressMedia({ bytes: PNG, filename: 'x.png', mimeType: 'image/png' })).rejects.toMatchObject({
      status: 403,
      data: { code: 'rest_cannot_create' },
    });

    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
        )
    );
    const pending = uploadWordPressMedia({ bytes: PNG, filename: 'x.png', mimeType: 'image/png' }, 'en', 10);
    await expect(pending).rejects.toBeInstanceOf(WordPressApiError);
    await expect(pending).rejects.toMatchObject({ status: 408 });
  });

  it('blocks writes on Preview deployments, in read-only mode and without credentials', () => {
    expect(getWordPressWriteBlock()).toBeNull();
    process.env.VERCEL_ENV = 'preview';
    expect(getWordPressWriteBlock()).toMatch(/Preview/);
    delete process.env.VERCEL_ENV;
    process.env.WP_READ_ONLY = 'true';
    expect(getWordPressWriteBlock()).toMatch(/Preview|production/);
    delete process.env.WP_READ_ONLY;
    delete process.env.WP_AUTH_APP_PASSWORD;
    expect(getWordPressWriteBlock()).toMatch(/no WordPress credentials/);
  });
});
