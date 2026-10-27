import { describe } from 'vitest';

/**
 * Suites that truncate tables are destructive: they delete every row in the
 * tables they touch. They must never run against a shared or production
 * database, so they only run when an explicit disposable database is provided:
 *
 *   TEST_DATABASE_URL="postgresql://user@localhost/entertain_lawyer_test" npm test
 *
 * Without it the suites are skipped (not failed) so a normal `npm test` on a
 * developer machine or CI without a database stays green.
 */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

/** `describe` that is skipped unless TEST_DATABASE_URL is configured. */
export const describeDb = hasTestDatabase ? describe : describe.skip;

/**
 * Last line of defence before a suite truncates anything: the database we are
 * actually connected to must look like a disposable test database.
 */
export async function assertTestDatabase(client: {
  $queryRawUnsafe: <T = unknown>(query: string) => Promise<T>;
}): Promise<void> {
  const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
    'SELECT current_database() AS name'
  );
  const name = rows[0]?.name ?? '';
  if (!/test/i.test(name)) {
    throw new Error(
      `Refusing to run destructive database tests against "${name}". ` +
        'Set TEST_DATABASE_URL to a disposable database whose name contains "test".'
    );
  }
}
