import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Article comments stored in Postgres.
 *
 * The table is created idempotently on first use (same pattern as the AI
 * embedding store) so deployments don't depend on a manual migration step.
 * Reads join the user table for the display name/avatar; comments never
 * accept HTML — the UI renders them as plain text.
 */

export const POST_TYPES = ['NEWS', 'BLOG', 'READ', 'NOTES', 'CASELAW'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const MAX_COMMENT_LENGTH = 2000;
const MAX_POST_ID_LENGTH = 64;
const MAX_LIST = 100;

export interface CommentRecord {
  id: string;
  postId: string;
  postType: string;
  userId: string;
  content: string;
  createdAt: Date;
  authorName: string | null;
  authorImage: string | null;
  /** Computed per-request; never exposes other users' ids. */
  canDelete?: boolean;
}

let tableReady = false;

async function ensureCommentsTable(): Promise<void> {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Comment" (
      "id" TEXT PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "postType" TEXT NOT NULL DEFAULT 'NEWS',
      "userId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Comment_post_created_idx"
      ON "Comment" ("postType", "postId", "createdAt" DESC)
  `);
  tableReady = true;
}

export function isPostType(value: unknown): value is PostType {
  return typeof value === 'string' && (POST_TYPES as readonly string[]).includes(value);
}

export function normalizePostId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, MAX_POST_ID_LENGTH);
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : null;
}

/** Trim, drop control characters, and enforce a sensible length. */
export function normalizeCommentBody(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_COMMENT_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export async function listComments(
  postId: string,
  postType: string,
  viewer?: { id: string; role?: string | null }
): Promise<Array<Omit<CommentRecord, 'userId'> & { canDelete: boolean }>> {
  await ensureCommentsTable();
  const rows = await prisma.$queryRaw<
    Array<Omit<CommentRecord, 'canDelete'>>
  >`
    SELECT c."id", c."postId", c."postType", c."userId", c."content", c."createdAt",
           u."name" AS "authorName", u."image" AS "authorImage"
    FROM "Comment" c
    LEFT JOIN "User" u ON u."id" = c."userId"
    WHERE c."postId" = ${postId} AND c."postType" = ${postType}
    ORDER BY c."createdAt" DESC
    LIMIT ${MAX_LIST}
  `;

  const isAdmin = viewer?.role === 'ADMIN';
  // Never return userId: GET /api/comments is public and the internal user id
  // is not needed by the client. Only the computed canDelete flag is exposed.
  return rows.map(({ userId, ...row }) => ({
    ...row,
    canDelete: Boolean(viewer && (isAdmin || userId === viewer.id)),
  }));
}

export async function createComment(input: {
  postId: string;
  postType: string;
  userId: string;
  content: string;
}): Promise<CommentRecord> {
  await ensureCommentsTable();
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "Comment" ("id", "postId", "postType", "userId", "content")
    VALUES (${id}, ${input.postId}, ${input.postType}, ${input.userId}, ${input.content})
  `;
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true, image: true },
  });
  return {
    id,
    postId: input.postId,
    postType: input.postType,
    userId: input.userId,
    content: input.content,
    createdAt: new Date(),
    authorName: user?.name ?? null,
    authorImage: user?.image ?? null,
    canDelete: true,
  };
}

/** Returns true when the comment existed and was removed. */
export async function deleteComment(
  id: string,
  actor: { id: string; role?: string | null }
): Promise<boolean> {
  await ensureCommentsTable();
  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId" FROM "Comment" WHERE "id" = ${id} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;
  if (row.userId !== actor.id && actor.role !== 'ADMIN') return false;
  await prisma.$executeRaw`DELETE FROM "Comment" WHERE "id" = ${id}`;
  return true;
}
