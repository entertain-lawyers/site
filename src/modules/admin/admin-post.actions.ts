'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['NEWS', 'BLOG', 'FACT', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featuredImage: z.string().optional().or(z.literal('')),
});

const updatePostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['NEWS', 'BLOG', 'FACT', 'NEPALI_SAMANYA_SAMACHAR', 'NEPALI_ADALAT_SAMACHAR', 'NEPALI_MUKHYA_SAMACHAR', 'NEPALI_NAJIRHARU', 'NEPALI_AIN_KANUN', 'NEPALI_BLOG_BICHAR']).optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featuredImage: z.string().optional().or(z.literal('')),
});

const deletePostSchema = z.object({
  id: z.string().uuid(),
});

export const createPostAction = createSafeAction(async (args: z.infer<typeof createPostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const post = await prisma.post.create({
    data: {
      title: args.title,
      content: args.content,
      type: args.type,
      status: args.status || (args.isPublished ? 'PUBLISHED' : 'DRAFT'),
      featuredImage: args.featuredImage || null,
      authorId: session.userId!, // The editor/admin creating it is the author
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId!,
      action: 'CREATE',
      entityType: 'POST',
      entityId: post.id,
      details: { title: post.title, type: post.type }
    }
  });

  revalidatePath('/admin/posts');
  return { id: post.id };
});

export const updatePostAction = createSafeAction(async (args: z.infer<typeof updatePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const existingPost = await prisma.post.findUnique({
    where: { id: args.id }
  });

  if (!existingPost) {
    throw new Error('Post not found');
  }

  const updateData: any = {};
  if (args.title !== undefined) updateData.title = args.title;
  if (args.content !== undefined) updateData.content = args.content;
  if (args.type !== undefined) updateData.type = args.type;
  if (args.status !== undefined) {
    updateData.status = args.status;
  } else if (args.isPublished !== undefined) {
    updateData.status = args.isPublished ? 'PUBLISHED' : 'DRAFT';
  }
  if (args.featuredImage !== undefined) updateData.featuredImage = args.featuredImage || null;

  const updatedPost = await prisma.post.update({
    where: { id: args.id },
    data: updateData
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId!,
      action: 'UPDATE',
      entityType: 'POST',
      entityId: updatedPost.id,
      details: { title: updatedPost.title, updatedFields: Object.keys(updateData) }
    }
  });

  revalidatePath('/admin/posts');
  return { success: true };
});

export const deletePostAction = createSafeAction(async (args: z.infer<typeof deletePostSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const existingPost = await prisma.post.findUnique({ where: { id: args.id } });



  await prisma.post.delete({
    where: { id: args.id }
  });

  if (existingPost) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'DELETE',
        entityType: 'POST',
        entityId: existingPost.id,
        details: { title: existingPost.title, type: existingPost.type }
      }
    });
  }

  revalidatePath('/admin/posts');
  return { success: true };
});
