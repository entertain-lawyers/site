'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role, type Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Puck documents (the drag & drop page builder) are arbitrary JSON trees with
// { content: [...], root: {...} } shape — kept loose here and validated by the
// editor on the client instead of an over-strict server schema.
const puckDataSchema = z.record(z.string(), z.unknown());

const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  data: puckDataSchema.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  metaTitle: z.string().max(200).optional(),
  metaDesc: z.string().max(500).optional(),
});

const updatePageSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  data: puckDataSchema.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDesc: z.string().max(500).optional(),
});

const deletePageSchema = z.object({ id: z.string().uuid() });

const publishPageSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PUBLISHED', 'DRAFT']).default('PUBLISHED'),
});

function authorize(role?: Role) {
  if (role !== Role.ADMIN && role !== Role.EDITOR) throw new Error('Unauthorized');
}

export const createBuilderPageAction = createSafeAction(
  async (args: z.infer<typeof createPageSchema>, context) => {
    authorize(context.role);

    const data: Record<string, unknown> = args.data?.content
      ? args.data
      : {
          content: [],
          root: { props: { title: args.title, metaTitle: args.metaTitle ?? '', metaDesc: args.metaDesc ?? '' } },
        };

    const page = await prisma.builderPage.create({
      data: {
        title: args.title,
        slug: args.slug,
        status: args.status,
        metaTitle: args.metaTitle,
        metaDesc: args.metaDesc,
        data: data as Prisma.InputJsonValue,
        authorId: context.userId!,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.userId!,
        action: 'CREATE',
        entityType: 'BUILDER_PAGE',
        entityId: page.id,
        details: { title: page.title },
      },
    });

    revalidatePath('/admin/pages');
    revalidatePath(`/p/${page.slug}`);
    return { id: page.id };
  }
);

export const updateBuilderPageAction = createSafeAction(
  async (args: z.infer<typeof updatePageSchema>, context) => {
    authorize(context.role);

    const { id, ...rest } = args;
    const updateData: Prisma.BuilderPageUpdateInput = {
      title: rest.title,
      slug: rest.slug,
      status: rest.status,
      metaTitle: rest.metaTitle,
      metaDesc: rest.metaDesc,
    };
    if (rest.data) updateData.data = rest.data as Prisma.InputJsonValue;

    const prev = await prisma.builderPage.findUnique({ where: { id }, select: { slug: true } });
    if (!prev) throw new Error('Page not found');

    const page = await prisma.builderPage.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: context.userId!,
        action: 'UPDATE',
        entityType: 'BUILDER_PAGE',
        entityId: page.id,
        details: { title: page.title },
      },
    });

    revalidatePath('/admin/pages');
    revalidatePath(`/p/${page.slug}`);
    if (prev.slug !== page.slug) revalidatePath(`/p/${prev.slug}`);
    return { id: page.id };
  }
);

export const publishBuilderPageAction = createSafeAction(
  async (args: z.infer<typeof publishPageSchema>, context) => {
    authorize(context.role);

    const page = await prisma.builderPage.update({
      where: { id: args.id },
      data: { status: args.status },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.userId!,
        action: 'UPDATE',
        entityType: 'BUILDER_PAGE',
        entityId: page.id,
        details: { title: page.title, change: args.status },
      },
    });

    revalidatePath('/admin/pages');
    revalidatePath(`/p/${page.slug}`);
    return { id: page.id };
  }
);

export const deleteBuilderPageAction = createSafeAction(
  async (args: z.infer<typeof deletePageSchema>, context) => {
    authorize(context.role);

    const page = await prisma.builderPage.delete({ where: { id: args.id } });

    await prisma.auditLog.create({
      data: {
        userId: context.userId!,
        action: 'DELETE',
        entityType: 'BUILDER_PAGE',
        entityId: page.id,
        details: { title: page.title },
      },
    });

    revalidatePath('/admin/pages');
    revalidatePath(`/p/${page.slug}`);
    return { id: page.id };
  }
);
