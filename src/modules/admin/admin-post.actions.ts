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
  type: z.enum(['NEWS', 'BLOG', 'FACT', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const updatePostSchema = z.object({
  id: z.coerce.number(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['NEWS', 'BLOG', 'FACT', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']).optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const deletePostSchema = z.object({
  id: z.coerce.number(),
  type: z.string().optional(),
});

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
  } catch (error: any) {
    if (error instanceof WordPressAuthError) {
      throw new Error('WordPress API Error: Server credentials missing or invalid.');
    }
    throw new Error(`WordPress API Error: ${error.message}`);
  }
});

export const updatePostAction = createSafeAction(async (args: z.infer<typeof updatePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
  }

  const lang = args.type ? (args.type.startsWith('NEPALI_') ? 'ne' : 'en') : 'en';
  
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
      categories: args.type ? mapTypeToCategory(args.type, lang) : undefined,
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
  } catch (error: any) {
    if (error instanceof WordPressAuthError) {
      throw new Error('WordPress API Error: Server credentials missing or invalid.');
    }
    throw new Error(`WordPress API Error: ${error.message}`);
  }
});

export const deletePostAction = createSafeAction(async (args: z.infer<typeof deletePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  if (process.env.VERCEL_ENV === 'preview' || process.env.WP_READ_ONLY === 'true') {
    throw new Error('Cannot perform write operations in Preview mode to protect production WordPress.');
  }

  const lang = args.type ? (args.type.startsWith('NEPALI_') ? 'ne' : 'en') : 'en';

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
  } catch (error: any) {
    if (error instanceof WordPressAuthError) {
      throw new Error('WordPress API Error: Server credentials missing or invalid.');
    }
    throw new Error(`WordPress API Error: ${error.message}`);
  }
});
