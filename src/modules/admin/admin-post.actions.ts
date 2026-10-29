'use server';

import { createSafeAction } from '@/lib/safe-action';
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
  mapTypeToCategory,
  mapCategoryToType
} from '@/lib/wordpress';

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['NEWS', 'BLOG', 'OPINION', 'FACT', 'PERSONALITY', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const updatePostSchema = z.object({
  id: z.coerce.number(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['NEWS', 'BLOG', 'OPINION', 'FACT', 'PERSONALITY', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']).optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  // Pinned by the edit page: the post only exists in one of the two WP installs.
  lang: z.enum(['en', 'ne']).optional(),
  // Sent when the admin did not change the type, so editing a post in a
  // category the type list doesn't cover neither fails nor drops categories.
  categories: z.array(z.coerce.number()).optional(),
});

const deletePostSchema = z.object({
  id: z.coerce.number(),
  type: z.string().optional(),
  lang: z.enum(['en', 'ne']).optional(),
});

// Bulk-list operation languages + target WP statuses ('trash' handled server
// side via deleteWordPressPost, permanent deletion additionally flags force).
const bulkSchema = z.object({
  ids: z.array(z.coerce.number()).min(1).max(50),
  lang: z.enum(['en', 'ne']).default('en'),
  action: z.enum(['TRASH', 'PUBLISH', 'DRAFT', 'DELETE_PERMANENTLY']),
});

/** Batch status change / trash / permanent delete — mirrors WP-admin "Bulk actions". */
export const bulkUpdatePostStatusAction = createSafeAction(
  async (args: z.infer<typeof bulkSchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

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

export const createPostAction = createSafeAction(async (args: z.infer<typeof createPostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
  }

  const lang = args.type.startsWith('NEPALI_') ? 'ne' : 'en';
  const status = args.status ? (args.status === 'PUBLISHED' ? 'publish' : 'draft') : (args.isPublished ? 'publish' : 'draft');

  try {
    const wpPost = await createWordPressPost({
      title: args.title,
      content: args.content,
      status: status,
      categories: mapTypeToCategory(args.type, lang),
    }, lang);

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId!,
          action: 'CREATE',
          entityType: 'POST_WP',
          entityId: String(wpPost.id),
          details: { title: wpPost.title.rendered, type: args.type, wpLang: lang }
        }
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Post created in WP but audit log failed:', auditError);
    }

    revalidatePath('/admin/posts');
    return { id: String(wpPost.id) };
  } catch (error: unknown) {
    if (error instanceof WordPressAuthError) {
      throw new Error('WordPress API Error: Server credentials missing or invalid.');
    }
    throw new Error(`WordPress API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

export const updatePostAction = createSafeAction(async (args: z.infer<typeof updatePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

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

  try {
    const wpPost = await updateWordPressPost(args.id, {
      title: args.title,
      content: args.content,
      status: status,
      categories: args.categories ?? (args.type ? mapTypeToCategory(args.type, lang) : undefined),
    }, lang);

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId!,
          action: 'UPDATE',
          entityType: 'POST_WP',
          entityId: String(wpPost.id),
          details: { title: wpPost.title.rendered, type: args.type, wpLang: lang }
        }
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Post updated in WP but audit log failed:', auditError);
    }

    revalidatePath('/admin/posts');
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof WordPressAuthError) {
      throw new Error('WordPress API Error: Server credentials missing or invalid.');
    }
    throw new Error(`WordPress API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

export const deletePostAction = createSafeAction(async (args: z.infer<typeof deletePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

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
    if (error instanceof WordPressAuthError) {
      throw new Error('WordPress API Error: Server credentials missing or invalid.');
    }
    throw new Error(`WordPress API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});
