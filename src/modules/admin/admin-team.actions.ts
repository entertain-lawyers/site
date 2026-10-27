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
  instagramUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  achievements: z.string().optional(),
  practiceAreas: z.string().optional(),
  languages: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
});

const teamMemberUpdateSchema = teamMemberSchema.extend({
  id: z.string().uuid(),
});

const deleteTeamMemberSchema = z.object({
  id: z.string().uuid(),
});

export const createTeamMemberAction = createSafeAction(async (data: z.infer<typeof teamMemberSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = teamMemberSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid team member details');
  }
  const input = parsed.data;

  const finalSlug = input.slug || generateSlug(input.name);

  // Ensure slug uniqueness
  let counter = 1;
  let uniqueSlug = finalSlug;
  while (await prisma.teamMember.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${finalSlug}-${counter}`;
    counter++;
  }

  const member = await prisma.teamMember.create({
    data: {
      name: input.name,
      designation: input.designation,
      slug: uniqueSlug,
      shortBio: input.shortBio || null,
      biography: input.biography || null,
      imageUrl: input.imageUrl || null,
      phone: input.phone || null,
      email: input.email || null,
      linkedinUrl: input.linkedinUrl || null,
      facebookUrl: input.facebookUrl || null,
      websiteUrl: input.websiteUrl || null,
      instagramUrl: input.instagramUrl || null,
      qualifications: input.qualifications || null,
      experience: input.experience || null,
      achievements: input.achievements || null,
      practiceAreas: input.practiceAreas || null,
      languages: input.languages || null,
      displayOrder: input.displayOrder,
      isPublished: input.isPublished,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'CREATE',
      entityType: 'TEAM_MEMBER',
      entityId: member.id,
      details: { name: member.name, slug: member.slug },
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

  const parsed = teamMemberUpdateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid team member details');
  }
  const input = parsed.data;

  let finalSlug = input.slug || generateSlug(input.name);

  // Ensure slug uniqueness if changed
  const existing = await prisma.teamMember.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error('Not found');

  if (existing.slug !== finalSlug) {
    let counter = 1;
    let uniqueSlug = finalSlug;
    while (await prisma.teamMember.findFirst({ where: { slug: uniqueSlug, id: { not: input.id } } })) {
      uniqueSlug = `${finalSlug}-${counter}`;
      counter++;
    }
    finalSlug = uniqueSlug;
  }

  const member = await prisma.teamMember.update({
    where: { id: input.id },
    data: {
      name: input.name,
      designation: input.designation,
      slug: finalSlug,
      shortBio: input.shortBio || null,
      biography: input.biography || null,
      imageUrl: input.imageUrl || null,
      phone: input.phone || null,
      email: input.email || null,
      linkedinUrl: input.linkedinUrl || null,
      facebookUrl: input.facebookUrl || null,
      websiteUrl: input.websiteUrl || null,
      instagramUrl: input.instagramUrl || null,
      qualifications: input.qualifications || null,
      experience: input.experience || null,
      achievements: input.achievements || null,
      practiceAreas: input.practiceAreas || null,
      languages: input.languages || null,
      displayOrder: input.displayOrder,
      isPublished: input.isPublished,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'TEAM_MEMBER',
      entityId: member.id,
      details: { name: member.name, slug: member.slug },
    },
  });

  revalidatePath('/team');
  revalidatePath(`/team/${member.slug}`);
  revalidatePath('/admin/team');
  return member;
});

export const deleteTeamMemberAction = createSafeAction(async (args: z.infer<typeof deleteTeamMemberSchema>, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized. Only Admins can delete.');
  }

  const parsed = deleteTeamMemberSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error('Invalid team member id');
  }

  let member;
  try {
    member = await prisma.teamMember.delete({ where: { id: parsed.data.id } });
  } catch (error) {
    if (isRecordNotFoundError(error)) throw new Error('Team member not found');
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'DELETE',
      entityType: 'TEAM_MEMBER',
      entityId: member.id,
      details: { name: member.name, slug: member.slug },
    },
  });

  revalidatePath('/team');
  revalidatePath('/admin/team');
  return member;
});
