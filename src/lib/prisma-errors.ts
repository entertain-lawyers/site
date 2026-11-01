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

/** P2022: the column does not exist in the database (migration pending/unapplied). */
export function isMissingColumnError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return isPrismaKnownRequestError(error, 'P2022');
}

/**
 * Checks whether an error is a Prisma P2022 missing-column error specifically
 * caused by one of the target column names (e.g. wpAuthorIdEn, wpAuthorIdNe, authorId, createdById).
 */
export function isSpecificMissingColumnError(
  error: unknown,
  columnNames: string[]
): error is Prisma.PrismaClientKnownRequestError {
  if (!isMissingColumnError(error)) {
    return false;
  }
  const metaColumn = error.meta?.column;
  if (typeof metaColumn === 'string') {
    if (columnNames.some((col) => metaColumn.includes(col))) {
      return true;
    }
  }
  const message = error.message || '';
  return columnNames.some((col) => message.includes(col));
}
