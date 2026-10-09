'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordNotFoundError } from '@/lib/prisma-errors';

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  designation: z.string().min(1, 'Designation is required'),
  slug: z.string().optional(),
  shortBio: z.string().optional(),
  biography: z.string().optional(),
  imageUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  facebookUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  practiceAreas: z.string().optional(),
  languages: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
});

const teamMemberUpdateSchema = teamMemberSchema.extend({
  id: z.string(),
});

export const createTeamMemberAction = createSafeAction(async (data: z.infer<typeof teamMemberSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const finalSlug = data.slug || generateSlug(data.name);

  // Ensure slug uniqueness
  let counter = 1;
  let uniqueSlug = finalSlug;
  while (await prisma.teamMember.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${finalSlug}-${counter}`;
    counter++;
  }

  const member = await prisma.teamMember.create({
    data: {
      name: data.name,
      designation: data.designation,
      slug: uniqueSlug,
      shortBio: data.shortBio || null,
      biography: data.biography || null,
      imageUrl: data.imageUrl || null,
      phone: data.phone || null,
      email: data.email || null,
      linkedinUrl: data.linkedinUrl || null,
      facebookUrl: data.facebookUrl || null,
      websiteUrl: data.websiteUrl || null,
      qualifications: data.qualifications || null,
      experience: data.experience || null,
      practiceAreas: data.practiceAreas || null,
      languages: data.languages || null,
      displayOrder: data.displayOrder,
      isPublished: data.isPublished,
    },
  });

  revalidatePath('/team');
  revalidatePath('/admin/team');
  return member;
});

export const updateTeamMemberAction = createSafeAction(async (data: z.infer<typeof teamMemberUpdateSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  let finalSlug = data.slug || generateSlug(data.name);

  // Ensure slug uniqueness if changed
  const existing = await prisma.teamMember.findUnique({ where: { id: data.id } });
  if (!existing) throw new Error('Not found');

  if (existing.slug !== finalSlug) {
    let counter = 1;
    let uniqueSlug = finalSlug;
    while (await prisma.teamMember.findFirst({ where: { slug: uniqueSlug, id: { not: data.id } } })) {
      uniqueSlug = `${finalSlug}-${counter}`;
      counter++;
    }
    finalSlug = uniqueSlug;
  }

  const member = await prisma.teamMember.update({
    where: { id: data.id },
    data: {
      name: data.name,
      designation: data.designation,
      slug: finalSlug,
      shortBio: data.shortBio || null,
      biography: data.biography || null,
      imageUrl: data.imageUrl || null,
      phone: data.phone || null,
      email: data.email || null,
      linkedinUrl: data.linkedinUrl || null,
      facebookUrl: data.facebookUrl || null,
      websiteUrl: data.websiteUrl || null,
      qualifications: data.qualifications || null,
      experience: data.experience || null,
      practiceAreas: data.practiceAreas || null,
      languages: data.languages || null,
      displayOrder: data.displayOrder,
      isPublished: data.isPublished,
    },
  });

  revalidatePath('/team');
  revalidatePath(`/team/${member.slug}`);
  revalidatePath('/admin/team');
  return member;
});

export const deleteTeamMemberAction = createSafeAction(async (id: string, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized. Only Admins can delete.');
  }

  let member;
  try {
    member = await prisma.teamMember.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFoundError(error)) throw new Error('Team member not found');
    throw error;
  }
  revalidatePath('/team');
  revalidatePath('/admin/team');
  return member;
});
