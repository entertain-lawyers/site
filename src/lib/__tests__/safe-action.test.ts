import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

import { z } from 'zod';
import { createSafeAction, parseOrThrow, UserFacingError } from '@/lib/safe-action';

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

  it('surfaces Zod 4 length messages and case-insensitive safe error messages', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await failWith(new Error('Too small: expected string to have >=8 characters'))(undefined)).toEqual({
      success: false,
      error: 'Too small: expected string to have >=8 characters',
    });
    expect(await failWith(new Error('Too big: expected string to have <=100 characters'))(undefined)).toEqual({
      success: false,
      error: 'Too big: expected string to have <=100 characters',
    });
    expect(await failWith(new Error('unauthorized action'))(undefined)).toEqual({
      success: false,
      error: 'unauthorized action',
    });
    expect(await failWith(new Error('invalid password format'))(undefined)).toEqual({
      success: false,
      error: 'invalid password format',
    });
  });

  describe('parseOrThrow', () => {
    const testSchema = z.object({
      field: z.string().min(5, 'Field must have at least 5 characters'),
    });

    it('returns parsed data when valid', () => {
      const data = parseOrThrow(testSchema, { field: 'hello world' });
      expect(data).toEqual({ field: 'hello world' });
    });

    it('throws UserFacingError on validation failure', () => {
      expect(() => parseOrThrow(testSchema, { field: 'hi' })).toThrow(UserFacingError);
      try {
        parseOrThrow(testSchema, { field: 'hi' });
      } catch (err) {
        expect(err).toBeInstanceOf(UserFacingError);
        expect((err as UserFacingError).message).toBe('Invalid input: Field must have at least 5 characters');
      }
    });
  });
});
