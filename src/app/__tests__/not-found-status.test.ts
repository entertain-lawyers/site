import { describe, it, expect } from 'vitest';

/**
 * HTTP status regression tests for soft 404s.
 *
 * These require a running, built server because the bug only appears in the
 * real App Router streaming pipeline; unit tests cannot observe the response
 * status. Point E2E_BASE_URL at a server started with `next start`:
 *
 *   E2E_BASE_URL=http://localhost:3000 npx vitest run \
 *     src/app/__tests__/not-found-status.test.ts
 *
 * Without E2E_BASE_URL the suite is skipped rather than silently passing.
 */
const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const describeWithServer = baseUrl ? describe : describe.skip;

describeWithServer('public 404 responses are not soft 404s', () => {
  const expectStatus = async (path: string, status: number) => {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: 'manual',
    });
    // Drain the body so the server can finish the response cleanly.
    await response.text();
    expect(response.status, `${path} should return ${status}`).toBe(status);
  };

  it('returns 404 for malformed resources page numbers', async () => {
    await expectStatus('/resources?page=0', 404);
    await expectStatus('/resources?page=abc', 404);
    await expectStatus('/resources?page=-1', 404);
    await expectStatus('/resources?page=1.5', 404);
  });

  it('returns 404 for out-of-range resources pages', async () => {
    await expectStatus('/resources?page=999999', 404);
  });

  it('returns 404 for an unknown resource id', async () => {
    await expectStatus('/resources/00000000-0000-0000-0000-000000000000', 404);
  });

  it('returns 404 for a missing event slug', async () => {
    await expectStatus('/events/definitely-not-a-real-event', 404);
  });

  it('returns 404 for a malformed or missing blog id', async () => {
    await expectStatus('/blogs/notanumber', 404);
    await expectStatus('/blogs/0', 404);
  });

  it('still returns 200 for the valid resources listing', async () => {
    await expectStatus('/resources', 200);
  });
});
