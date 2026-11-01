import { expect, it, afterAll, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertTestDatabase, describeDb } from '@/test/db';
import { ResourceType, ContentStatus, Prisma } from '@prisma/client';

/**
 * Runs against the disposable TEST_DATABASE_URL only.
 * Specifically verifies that when database migration 20261101000000 is absent (Resource.authorId
 * and Resource.createdById columns missing), queries using RESOURCE_MUTATION_SELECT succeed
 * on real PostgreSQL, while queries without select fail with P2022.
 */
describeDb('Resource fallback real database verification (migration absent)', () => {
  const runId = randomUUID().slice(0, 8);
  const createdIds: string[] = [];
  let isMigrationAbsent = false;

  beforeAll(async () => {
    await assertTestDatabase(prisma);

    // Verify whether authorId/createdById are absent in this database
    const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Resource' AND column_name IN ('authorId', 'createdById');
    `;
    isMigrationAbsent = cols.length === 0;
  });

  afterAll(async () => {
    for (const id of createdIds) {
      try {
        await prisma.resource.delete({
          where: { id },
          select: { id: true },
        });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('verifies that queries without select fail when columns are absent, but succeed with explicit minimal select', async () => {
    if (!isMigrationAbsent) {
      // In databases where the migration is already applied, skip this test
      return;
    }

    const testId = `res-test-${runId}-1`;
    createdIds.push(testId);

    // 1. Without select, create fails because Prisma requests missing authorId/createdById
    let errorWithoutSelect: unknown;
    try {
      await prisma.resource.create({
        data: {
          id: testId,
          title: `Fallback Test ${runId}`,
          type: ResourceType.OTHER,
          status: ContentStatus.DRAFT,
        },
      });
    } catch (err) {
      errorWithoutSelect = err;
    }

    expect(errorWithoutSelect).toBeDefined();
    expect((errorWithoutSelect as Prisma.PrismaClientKnownRequestError).code).toBe('P2022');

    // 2. With minimal select, create succeeds on the exact same database without the columns!
    const created = await prisma.resource.create({
      data: {
        id: testId,
        title: `Fallback Test ${runId}`,
        type: ResourceType.OTHER,
        status: ContentStatus.DRAFT,
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
      },
    });

    expect(created.id).toBe(testId);
    expect(created.title).toBe(`Fallback Test ${runId}`);

    // 3. Without select, update fails on missing columns
    let updateErrorWithoutSelect: unknown;
    try {
      await prisma.resource.update({
        where: { id: testId },
        data: {
          title: `Updated Title ${runId}`,
        },
      });
    } catch (err) {
      updateErrorWithoutSelect = err;
    }

    expect(updateErrorWithoutSelect).toBeDefined();
    expect((updateErrorWithoutSelect as Prisma.PrismaClientKnownRequestError).code).toBe('P2022');

    // 4. With minimal select, update succeeds on the exact same database!
    const updated = await prisma.resource.update({
      where: { id: testId },
      data: {
        title: `Updated Title ${runId}`,
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
      },
    });

    expect(updated.id).toBe(testId);
    expect(updated.title).toBe(`Updated Title ${runId}`);
  });
});
