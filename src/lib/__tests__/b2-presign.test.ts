import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({
  env: {
    B2_ENDPOINT: 'http://localhost:9000',
    B2_BUCKET_NAME: 'entertain-lawyers-local',
    B2_ACCESS_KEY_ID: 'test-key',
    B2_SECRET_ACCESS_KEY: 'test-secret',
  },
}));

import { generatePresignedPutUrl } from '@/lib/b2';

describe('generatePresignedPutUrl (regression)', () => {
  it('does not pre-sign a checksum of an empty body', async () => {
    const url = new URL(await generatePresignedPutUrl('documents/x.pdf', 'application/pdf', 600, 1234));

    // With SDK defaults this carried x-amz-checksum-crc32=AAAAAA== (CRC32 of
    // nothing), so storage rejected the real PDF the browser uploaded.
    expect(url.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(url.searchParams.has('x-amz-sdk-checksum-algorithm')).toBe(false);
    expect(url.pathname).toBe('/entertain-lawyers-local/documents/x.pdf');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
  });
});
