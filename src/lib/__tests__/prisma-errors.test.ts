import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  isMissingTableError,
  isRecordNotFoundError,
  isMissingColumnError,
  isSpecificMissingColumnError,
} from '../prisma-errors';

const known = (code: string, meta?: Record<string, unknown>, message?: string) =>
  new Prisma.PrismaClientKnownRequestError(message || `error ${code}`, {
    code,
    clientVersion: 'test',
    meta,
  });

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

describe('isMissingColumnError & isSpecificMissingColumnError', () => {
  it('recognises P2022 as missing column error', () => {
    expect(isMissingColumnError(known('P2022'))).toBe(true);
    expect(isMissingColumnError(known('P2021'))).toBe(false);
    expect(isMissingColumnError(new Error('P2022'))).toBe(false);
  });

  it('detects when P2022 is specifically caused by target columns in meta.column', () => {
    const error = known('P2022', { column: 'User.wpAuthorIdEn' });
    expect(isSpecificMissingColumnError(error, ['wpAuthorIdEn', 'wpAuthorIdNe'])).toBe(true);
    expect(isSpecificMissingColumnError(error, ['authorId', 'createdById'])).toBe(false);
  });

  it('detects when P2022 is specifically caused by target columns in message', () => {
    const error = known('P2022', undefined, 'column "authorId" does not exist in table Resource');
    expect(isSpecificMissingColumnError(error, ['authorId', 'createdById'])).toBe(true);
    expect(isSpecificMissingColumnError(error, ['wpAuthorIdEn', 'wpAuthorIdNe'])).toBe(false);
  });

  it('returns false for unrelated errors or other Prisma codes', () => {
    const errorP2002 = known('P2002', { target: ['wpAuthorIdEn'] });
    expect(isSpecificMissingColumnError(errorP2002, ['wpAuthorIdEn'])).toBe(false);

    const genericError = new Error('column User.wpAuthorIdEn does not exist');
    expect(isSpecificMissingColumnError(genericError, ['wpAuthorIdEn'])).toBe(false);
  });
});
