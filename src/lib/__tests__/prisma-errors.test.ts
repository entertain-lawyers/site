import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { isMissingTableError, isRecordNotFoundError } from '../prisma-errors';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`error ${code}`, { code, clientVersion: 'test' });

describe('isMissingTableError', () => {
  it('recognises P2021, raised when a migration was never applied', () => {
    expect(isMissingTableError(known('P2021'))).toBe(true);
  });

  it('does not match other Prisma errors or plain errors', () => {
    expect(isMissingTableError(known('P2025'))).toBe(false);
    expect(isMissingTableError(new Error('The table does not exist'))).toBe(false);
    expect(isRecordNotFoundError(known('P2021'))).toBe(false);
  });
});
