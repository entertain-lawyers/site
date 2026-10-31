import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

import { createSafeAction, UserFacingError } from '@/lib/safe-action';

describe('createSafeAction error messages', () => {
  const failWith = (error: unknown) => createSafeAction(async () => { throw error; });

  it('always shows UserFacingError messages (regression: lowercase "cannot" was hidden)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await failWith(new UserFacingError('This resource has purchases and cannot be deleted.'))(undefined);
    expect(res).toEqual({ success: false, error: 'This resource has purchases and cannot be deleted.' });
  });

  it('still hides internal errors that are not marked as user-facing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await failWith(new Error('ESEWA_SECRET_KEY is not configured'))(undefined)).toEqual({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    });
    expect((await failWith(new Error('Resource not found'))(undefined))).toEqual({ success: false, error: 'Resource not found' });
  });
});
