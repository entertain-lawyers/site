'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { consultationLawyerSchema } from './admin-lawyer.schema';
import { slugify, slugifyWithFallback, withUniqueSlug } from '@/lib/slug';
import { isRecordNotFoundError } from '@/lib/prisma-errors';

const slugIsTaken = (excludeId?: string) => async (slug: string) =>
  Boolean(
    await prisma.consultationLawyer.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  );

const lawyerUpdateSchema = consultationLawyerSchema.extend({
  id: z.string().uuid(),
});

const deleteLawyerSchema = z.object({
  id: z.string().uuid(),
});

const toggleAvailabilitySchema = z.object({
  id: z.string().uuid(),
  isAvailable: z.boolean(),
});

type LawyerInput = z.output<typeof consultationLawyerSchema>;

/** Every column except name/slug, shared by create and update. */
function lawyerFields(input: LawyerInput) {
  return {
    title: input.title.trim(),
    licenseNumber: input.licenseNumber?.trim() || null,
    specialization: input.specialization?.trim() || null,
    practiceAreas: input.practiceAreas?.trim() || null,
    courtJurisdiction: input.courtJurisdiction?.trim() || null,
    experience: input.experience?.trim() || null,
    qualifications: input.qualifications?.trim() || null,
    languages: input.languages?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    whatsappNumber: input.whatsappNumber?.trim() || null,
    location: input.location?.trim() || null,
    shortBio: input.shortBio?.trim() || null,
    bio: input.bio?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    rating: input.rating ?? 5.0,
    displayOrder: input.displayOrder,
    isAvailable: input.isAvailable,
    isFeatured: input.isFeatured,
  };
}

export const createConsultationLawyerAction = createSafeAction(
  async (data: z.input<typeof consultationLawyerSchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized: Admin or Editor role required');
    }

    const parsed = consultationLawyerSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid lawyer details');
    }
    const input = parsed.data;

    const baseSlug = slugify(input.slug ?? '') || slugifyWithFallback(input.name, 'advocate');

    const lawyer = await withUniqueSlug(baseSlug, slugIsTaken(), (slug) =>
      prisma.consultationLawyer.create({
        data: {
          name: input.name.trim(),
          slug,
          ...lawyerFields(input),
        },
      })
    );

    revalidatePath('/admin/lawyers');
    revalidatePath('/consultation');

    return lawyer;
  },
  { requireAuth: true }
);

export const updateConsultationLawyerAction = createSafeAction(
  async (data: z.input<typeof lawyerUpdateSchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized: Admin or Editor role required');
    }

    const parsed = lawyerUpdateSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid lawyer update details');
    }
    const input = parsed.data;

    const existing = await prisma.consultationLawyer.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new Error('Lawyer profile not found');
    }

    // A cleared slug keeps the current one so links stay stable, unless the
    // stored slug is malformed (e.g. "" or "-1" from the old ASCII-only
    // generator applied to a Nepali name), in which case it is regenerated.
    const currentSlug = existing.slug && slugify(existing.slug) === existing.slug ? existing.slug : '';
    const requestedSlug =
      slugify(input.slug ?? '') || currentSlug || slugifyWithFallback(input.name, 'advocate');

    const updated = await withUniqueSlug(
      requestedSlug,
      requestedSlug === existing.slug ? async () => false : slugIsTaken(input.id),
      (slug) =>
        prisma.consultationLawyer.update({
          where: { id: input.id },
          data: {
            name: input.name.trim(),
            slug,
            ...lawyerFields(input),
          },
        })
    );

    revalidatePath('/admin/lawyers');
    revalidatePath('/consultation');

    return updated;
  },
  { requireAuth: true }
);

export const deleteConsultationLawyerAction = createSafeAction(
  async (data: z.infer<typeof deleteLawyerSchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized: Admin or Editor role required');
    }

    const parsed = deleteLawyerSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error('Invalid delete request');
    }

    let removed;
    try {
      removed = await prisma.consultationLawyer.delete({
        where: { id: parsed.data.id },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new Error('Lawyer profile not found');
      throw error;
    }

    // Every other admin delete is audited; lawyer profiles were not.
    if (session.userId) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'DELETE',
          entityType: 'CONSULTATION_LAWYER',
          entityId: removed.id,
          details: { name: removed.name, slug: removed.slug },
        },
      });
    }

    revalidatePath('/admin/lawyers');
    revalidatePath('/consultation');

    return { success: true };
  },
  { requireAuth: true }
);

export const toggleConsultationLawyerAvailabilityAction = createSafeAction(
  async (data: z.infer<typeof toggleAvailabilitySchema>, session) => {
    if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

    const parsed = toggleAvailabilitySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error('Invalid request');
    }

    let updated;
    try {
      updated = await prisma.consultationLawyer.update({
        where: { id: parsed.data.id },
        data: { isAvailable: parsed.data.isAvailable },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new Error('Lawyer profile not found');
      throw error;
    }

    revalidatePath('/admin/lawyers');
    revalidatePath('/consultation');

    return updated;
  },
  { requireAuth: true }
);
