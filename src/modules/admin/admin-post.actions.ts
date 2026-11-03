'use server';

import { createSafeAction, UserFacingError } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import {
  createWordPressPost,
  updateWordPressPost,
  deleteWordPressPost,
  WordPressAuthError,
  WordPressApiError,
  getWordPressAuthenticatedUser,
  mapTypeToCategory,
} from '@/lib/wordpress';
import { resolveLocalAuthor, type AuthorOption } from '@/lib/content-authors';
import { getPublicPostUrl } from '@/lib/post-url';

/**
 * Turn a failed WordPress write into a message that says what to fix. A
 * missing credential and a credential WordPress rejects need different fixes,
 * but both used to read "Server credentials missing or invalid."
 */
function toWordPressWriteError(error: unknown, lang: 'en' | 'ne'): Error {
  if (error instanceof WordPressAuthError) {
    const missing = lang === 'ne'
      ? 'WP_NEPALI_AUTH_USERNAME and WP_NEPALI_AUTH_APP_PASSWORD'
      : 'WP_AUTH_USERNAME and WP_AUTH_APP_PASSWORD';
    return new UserFacingError(
      `WordPress API Error: this server has no ${lang === 'ne' ? 'Nepali ' : ''}WordPress credentials, so posts cannot be saved. Set ${missing} (a WordPress application password) in the hosting environment and redeploy.`
    );
  }
  if (error instanceof WordPressApiError && (error.status === 401 || error.status === 403)) {
    const passwordVar = lang === 'ne' ? 'WP_NEPALI_AUTH_APP_PASSWORD' : 'WP_AUTH_APP_PASSWORD';
    return new UserFacingError(
      `WordPress API Error: WordPress rejected the server credentials (HTTP ${error.status}). The application password in ${passwordVar} may be wrong or revoked, or the user lacks permission to publish.`
    );
  }
  if (error instanceof WordPressApiError && error.status === 400) {
    // e.g. "Invalid featured media ID." — WordPress's own message says what to fix.
    const message = (error.data as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && message.trim()) {
      return new UserFacingError(`WordPress API Error: ${message.replace(/<[^>]*>/g, '').trim()}`);
    }
  }
  return new Error(`WordPress API Error: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Turns a failed `/users/me` lookup into a message that says what to fix. The
 * post must not be saved with the author silently left as someone else.
 */
function toAuthorAssignmentError(error: unknown, lang: 'en' | 'ne'): UserFacingError {
  const install = lang === 'ne' ? 'Nepali WordPress' : 'WordPress';
  const mapHint = 'or map this author in Admin → Users';

  if (error instanceof WordPressAuthError) {
    const vars = lang === 'ne'
      ? 'WP_NEPALI_AUTH_HEADER (or WP_NEPALI_AUTH_USERNAME + WP_NEPALI_AUTH_APP_PASSWORD)'
      : 'WP_AUTH_HEADER (or WP_AUTH_USERNAME + WP_AUTH_APP_PASSWORD)';
    return new UserFacingError(
      `This author has no ${install} author mapping, and the server has no ${install} credentials to identify the site's publishing account. Set ${vars} ${mapHint}.`
    );
  }

  if (error instanceof WordPressApiError && (error.status === 401 || error.status === 403)) {
    return new UserFacingError(
      `${install} rejected the server credentials (HTTP ${error.status}), so the site's publishing account could not be identified for this unmapped author. Fix the application password ${mapHint}.`
    );
  }

  const status = error instanceof WordPressApiError && error.status ? ` (HTTP ${error.status})` : '';
  return new UserFacingError(
    `The site's ${install} publishing account could not be identified${status}, so the post was not saved with this unmapped author. Try again ${mapHint}.`
  );
}

/**
 * WordPress author id for an explicitly selected local author. An explicit
 * per-install mapping wins; without one the post is credited to the account
 * this server authenticates as on that install (resolved from `/users/me`),
 * never to a local id, a name, or the other install's account.
 *
 * Returns null when no author was selected, so WordPress keeps its author.
 */
async function resolvePostAuthor(
  authorUserId: string | undefined,
  lang: 'en' | 'ne'
): Promise<{ author: AuthorOption; wpAuthorId: number } | null> {
  if (!authorUserId) return null;

  const author = await resolveLocalAuthor(authorUserId);
  const mapped = (lang === 'ne' ? author.wpAuthorIdNe : author.wpAuthorIdEn) ?? null;
  if (mapped) return { author, wpAuthorId: mapped };

  try {
    const integrationUser = await getWordPressAuthenticatedUser(lang);
    return { author, wpAuthorId: integrationUser.id };
  } catch (error) {
    throw toAuthorAssignmentError(error, lang);
  }
}

// WordPress media id for the featured image; 0 removes it (updates only).
const featuredMediaIdSchema = z.coerce.number().int().min(0).optional();

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['NEWS', 'BLOG', 'OPINION', 'FACT', 'PERSONALITY', 'CASE_LAW', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featuredMediaId: featuredMediaIdSchema,
  // Local user credited as the author. Resolved to that install's WordPress
  // user id server-side; omitted means "keep the WordPress default".
  authorUserId: z.string().min(1).optional(),
});

const updatePostSchema = z.object({
  id: z.coerce.number(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['NEWS', 'BLOG', 'OPINION', 'FACT', 'PERSONALITY', 'CASE_LAW', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']).optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  // Pinned by the edit page: the post only exists in one of the two WP installs.
  lang: z.enum(['en', 'ne']).optional(),
  // Sent when the admin did not change the type, so editing a post in a
  // category the type list doesn't cover neither fails nor drops categories.
  categories: z.array(z.coerce.number()).optional(),
  // Omitted when the featured image was not touched, so it is left as it is.
  featuredMediaId: featuredMediaIdSchema,
  // Local user credited as the author. Omitted leaves WordPress's author as is.
  authorUserId: z.string().min(1).optional(),
});

const deletePostSchema = z.object({
  id: z.coerce.number(),
  type: z.string().optional(),
  lang: z.enum(['en', 'ne']).optional(),
});

// Bulk-list operation languages + target WP statuses ('trash' handled server
// side via deleteWordPressPost, permanent deletion additionally flags force).
const bulkSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(50),
  lang: z.enum(['en', 'ne']).default('en'),
  action: z.enum(['TRASH', 'PUBLISH', 'DRAFT', 'DELETE_PERMANENTLY']),
});

/** Batch status change / trash / permanent delete — mirrors WP-admin "Bulk actions". */
export const bulkUpdatePostStatusAction = createSafeAction(
  async (rawArgs: z.infer<typeof bulkSchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

    const parsed = bulkSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid bulk operation input');
    }
    const args = parsed.data;

    if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
      throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
    }

    const succeeded: number[] = [];
    const failed: number[] = [];

    for (const id of args.ids) {
      try {
        if (args.action === 'DELETE_PERMANENTLY') {
          await deleteWordPressPost(id, true, args.lang);
        } else if (args.action === 'TRASH') {
          await deleteWordPressPost(id, false, args.lang);
        } else {
          await updateWordPressPost(id, { status: args.action === 'PUBLISH' ? 'publish' : 'draft' }, args.lang);
        }
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }

    const counts = { succeeded: succeeded.length, failed: failed.length };

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId!,
          action: 'UPDATE',
          entityType: 'POST_WP',
          entityId: 'bulk',
          details: { wpLang: args.lang, wpAction: args.action, ...counts, failedIds: failed }
        }
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Bulk op applied but audit log failed:', auditError);
    }

    revalidatePath('/admin/posts');
    return { ...counts };
  }
);

export const createPostAction = createSafeAction(async (rawArgs: z.infer<typeof createPostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = createPostSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid post input');
  }
  const args = parsed.data;

  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
  }

  const lang = args.type.startsWith('NEPALI_') ? 'ne' : 'en';
  const status = args.status ? (args.status === 'PUBLISHED' ? 'publish' : 'draft') : (args.isPublished ? 'publish' : 'draft');

  // Resolved before the WordPress write so a missing mapping/identity reports
  // its own actionable message instead of a generic save failure.
  const assignedAuthor = await resolvePostAuthor(args.authorUserId, lang);

  try {
    const wpPost = await createWordPressPost({
      title: args.title,
      content: args.content,
      status: status,
      categories: mapTypeToCategory(args.type, lang),
      ...(assignedAuthor ? { author: assignedAuthor.wpAuthorId } : {}),
      ...(args.featuredMediaId ? { featured_media: args.featuredMediaId } : {}),
    }, lang);

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId!,
          action: 'CREATE',
          entityType: 'POST_WP',
          entityId: String(wpPost.id),
          details: {
            title: wpPost.title.rendered,
            type: args.type,
            wpLang: lang,
            featuredMediaId: args.featuredMediaId ?? null,
            authorUserId: assignedAuthor?.author.id ?? null,
            authorName: assignedAuthor?.author.name ?? null,
            wpAuthorId: assignedAuthor?.wpAuthorId ?? null,
          }
        }
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Post created in WP but audit log failed:', auditError);
    }

    revalidatePath('/admin/posts');
    const postUrl = getPublicPostUrl({ id: wpPost.id, type: args.type, lang });
    return {
      id: String(wpPost.id),
      status: wpPost.status,
      url: postUrl,
      success: true,
    };
  } catch (error: unknown) {
    throw toWordPressWriteError(error, lang);
  }
});

export const updatePostAction = createSafeAction(async (rawArgs: z.infer<typeof updatePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = updatePostSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid update input');
  }
  const args = parsed.data;

  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
  }

  const lang = args.lang ?? (args.type ? (args.type.startsWith('NEPALI_') ? 'ne' : 'en') : 'en');

  let status: 'publish' | 'draft' | 'trash' | undefined;
  if (args.status) {
    status = args.status === 'PUBLISHED' ? 'publish' : 'draft';
  } else if (args.isPublished !== undefined) {
    status = args.isPublished ? 'publish' : 'draft';
  }

  // Resolved before the WordPress write so a missing mapping/identity reports
  // its own actionable message instead of a generic save failure.
  const assignedAuthor = await resolvePostAuthor(args.authorUserId, lang);

  try {
    const wpPost = await updateWordPressPost(args.id, {
      title: args.title,
      content: args.content,
      status: status,
      categories: args.categories ?? (args.type ? mapTypeToCategory(args.type, lang) : undefined),
      ...(assignedAuthor ? { author: assignedAuthor.wpAuthorId } : {}),
      ...(args.featuredMediaId !== undefined ? { featured_media: args.featuredMediaId } : {}),
    }, lang);

    try {
      let auditAuthorData: { authorUserId?: string; authorName?: string; wpAuthorId?: number } | undefined = undefined;
      if (assignedAuthor) {
        auditAuthorData = {
          authorUserId: assignedAuthor.author.id,
          authorName: assignedAuthor.author.name,
          wpAuthorId: assignedAuthor.wpAuthorId,
        };
      } else {
        try {
          const priorLogs = await prisma.auditLog.findMany({
            where: {
              entityType: 'POST_WP',
              entityId: String(wpPost.id),
              action: { in: ['CREATE', 'UPDATE'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { details: true },
          });
          for (const log of priorLogs) {
            const d = log.details as { authorUserId?: string; authorName?: string; wpAuthorId?: number } | null;
            if (d && (d.authorUserId || d.authorName)) {
              auditAuthorData = {
                ...(d.authorUserId ? { authorUserId: d.authorUserId } : {}),
                ...(d.authorName ? { authorName: d.authorName } : {}),
                ...(d.wpAuthorId ? { wpAuthorId: d.wpAuthorId } : {}),
              };
              break;
            }
          }
        } catch (priorErr) {
          console.warn('[updatePostAction] error preserving prior author in audit log:', priorErr);
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: session.userId!,
          action: 'UPDATE',
          entityType: 'POST_WP',
          entityId: String(wpPost.id),
          details: {
            title: wpPost.title.rendered,
            type: args.type,
            wpLang: lang,
            ...(args.featuredMediaId !== undefined ? { featuredMediaId: args.featuredMediaId } : {}),
            ...(auditAuthorData ?? {}),
          }
        }
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Post updated in WP but audit log failed:', auditError);
    }

    revalidatePath('/admin/posts');
    const postUrl = getPublicPostUrl({ id: wpPost.id, type: args.type, lang });
    return {
      id: String(wpPost.id),
      status: wpPost.status,
      url: postUrl,
      success: true,
    };
  } catch (error: unknown) {
    throw toWordPressWriteError(error, lang);
  }
});

export const deletePostAction = createSafeAction(async (rawArgs: z.infer<typeof deletePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = deletePostSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid delete input');
  }
  const args = parsed.data;

  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
  }

  const lang = args.lang ?? (args.type ? (args.type.startsWith('NEPALI_') ? 'ne' : 'en') : 'en');

  try {
    const result = await deleteWordPressPost(args.id, false, lang);

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId!,
          action: 'DELETE',
          entityType: 'POST_WP',
          entityId: String(args.id),
          details: { wpLang: lang, deleted: result.deleted }
        }
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Post deleted in WP but audit log failed:', auditError);
    }

    revalidatePath('/admin/posts');
    return { success: true };
  } catch (error: unknown) {
    throw toWordPressWriteError(error, lang);
  }
});
