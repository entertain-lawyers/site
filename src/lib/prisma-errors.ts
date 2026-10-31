import { Prisma } from '@prisma/client';

export function isPrismaKnownRequestError(
  error: unknown,
  codes: string | string[]
): error is Prisma.PrismaClientKnownRequestError {
  const expectedCodes = Array.isArray(codes) ? codes : [codes];
  return error instanceof Prisma.PrismaClientKnownRequestError && expectedCodes.includes(error.code);
}

export function isUniqueConstraintError(error: unknown) {
  return isPrismaKnownRequestError(error, 'P2002');
}

export function isRecordInUseError(error: unknown) {
  return isPrismaKnownRequestError(error, ['P2003', 'P2014']);
}

export function isRecordNotFoundError(error: unknown) {
  return isPrismaKnownRequestError(error, 'P2025');
}

/** P2021: the table does not exist, i.e. a migration was never applied to this database. */
export function isMissingTableError(error: unknown) {
  return isPrismaKnownRequestError(error, 'P2021');
}
