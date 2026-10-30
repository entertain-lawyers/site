'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { consultationLawyerSchema } from './admin-lawyer.schema';

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

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

    const baseSlug = input.slug?.trim() || generateSlug(input.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await prisma.consultationLawyer.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const lawyer = await prisma.consultationLawyer.create({
      data: {
        name: input.name.trim(),
        slug: finalSlug,
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
      },
    });

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

    let finalSlug = input.slug?.trim() || existing.slug;
    if (finalSlug !== existing.slug) {
      let counter = 1;
      let baseSlug = finalSlug;
      while (true) {
        const conflict = await prisma.consultationLawyer.findUnique({ where: { slug: finalSlug } });
        if (!conflict || conflict.id === input.id) break;
        finalSlug = `${baseSlug}-${counter++}`;
      }
    }

    const updated = await prisma.consultationLawyer.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        slug: finalSlug,
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
      },
    });

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

    await prisma.consultationLawyer.delete({
      where: { id: parsed.data.id },
    });

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

    const updated = await prisma.consultationLawyer.update({
      where: { id: parsed.data.id },
      data: { isAvailable: parsed.data.isAvailable },
    });

    revalidatePath('/admin/lawyers');
    revalidatePath('/consultation');

    return updated;
  },
  { requireAuth: true }
);
