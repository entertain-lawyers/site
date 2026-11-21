import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

export const REACTION_TYPES = ['happy', 'laugh', 'love', 'shock', 'sad', 'angry'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export interface ReactionCounts {
  happy: number;
  laugh: number;
  love: number;
  shock: number;
  sad: number;
  angry: number;
}

let tableReady = false;

export async function ensureReactionsTable(): Promise<void> {
  if (tableReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Reaction" (
        "id" TEXT PRIMARY KEY,
        "postId" TEXT NOT NULL,
        "postType" TEXT NOT NULL DEFAULT 'NEWS',
        "userId" TEXT NOT NULL,
        "reaction" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "Reaction_user_post_unique" UNIQUE ("postId", "postType", "userId")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Reaction_post_idx"
        ON "Reaction" ("postType", "postId")
    `);
    tableReady = true;
  } catch (error) {
    console.error('[reactions] ensureReactionsTable error:', error);
  }
}

export async function getReactions(
  postId: string,
  postType: string,
  userId?: string | null
): Promise<{ counts: ReactionCounts; userReaction: ReactionType | null }> {
  await ensureReactionsTable();

  const emptyCounts: ReactionCounts = {
    happy: 0,
    laugh: 0,
    love: 0,
    shock: 0,
    sad: 0,
    angry: 0,
  };

  try {
    const countsResult = await prisma.$queryRaw<Array<{ reaction: string; count: number | bigint }>>`
      SELECT "reaction", COUNT(*)::int AS count
      FROM "Reaction"
      WHERE "postId" = ${postId} AND "postType" = ${postType}
      GROUP BY "reaction"
    `;

    for (const row of countsResult) {
      if (row.reaction in emptyCounts) {
        emptyCounts[row.reaction as ReactionType] = Number(row.count);
      }
    }

    let userReaction: ReactionType | null = null;
    if (userId) {
      const userResult = await prisma.$queryRaw<Array<{ reaction: string }>>`
        SELECT "reaction"
        FROM "Reaction"
        WHERE "postId" = ${postId} AND "postType" = ${postType} AND "userId" = ${userId}
        LIMIT 1
      `;
      if (userResult.length > 0 && userResult[0].reaction in emptyCounts) {
        userReaction = userResult[0].reaction as ReactionType;
      }
    }

    return { counts: emptyCounts, userReaction };
  } catch (err) {
    console.error('[reactions] getReactions error:', err);
    return { counts: emptyCounts, userReaction: null };
  }
}

export async function toggleReaction(
  postId: string,
  postType: string,
  userId: string,
  reaction: ReactionType
): Promise<{ counts: ReactionCounts; userReaction: ReactionType | null }> {
  await ensureReactionsTable();

  try {
    // Check existing
    const existing = await prisma.$queryRaw<Array<{ id: string; reaction: string }>>`
      SELECT "id", "reaction"
      FROM "Reaction"
      WHERE "postId" = ${postId} AND "postType" = ${postType} AND "userId" = ${userId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      if (existing[0].reaction === reaction) {
        // Toggle off
        await prisma.$executeRawUnsafe(
          `DELETE FROM "Reaction" WHERE "id" = $1`,
          existing[0].id
        );
      } else {
        // Switch reaction
        await prisma.$executeRawUnsafe(
          `UPDATE "Reaction" SET "reaction" = $1, "createdAt" = now() WHERE "id" = $2`,
          reaction,
          existing[0].id
        );
      }
    } else {
      // Insert new
      const newId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Reaction" ("id", "postId", "postType", "userId", "reaction") VALUES ($1, $2, $3, $4, $5)`,
        newId,
        postId,
        postType,
        userId,
        reaction
      );
    }
  } catch (err) {
    console.error('[reactions] toggleReaction error:', err);
  }

  return getReactions(postId, postType, userId);
}
