'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isRecordNotFoundError } from '@/lib/prisma-errors';
import { slugify, slugifyWithFallback, withUniqueSlug } from '@/lib/slug';
import { isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE } from '@/lib/url-validation';

const slugIsTaken = (excludeId?: string) => async (slug: string) =>
  Boolean(
    await prisma.teamMember.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  );

type TeamMemberInput = z.infer<typeof teamMemberSchema>;

/** Every column except slug, shared by create and update. */
function memberFields(input: TeamMemberInput) {
  return {
    name: input.name,
    designation: input.designation,
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
  };
}

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  designation: z.string().min(1, 'Designation is required'),
  slug: z.string().optional(),
  shortBio: z.string().optional(),
  biography: z.string().optional(),
  imageUrl: z.string().refine(isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE).optional(),
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

  const baseSlug = slugify(input.slug ?? '') || slugifyWithFallback(input.name, 'member');

  const member = await withUniqueSlug(baseSlug, slugIsTaken(), (slug) =>
    prisma.teamMember.create({ data: { slug, ...memberFields(input) } })
  );

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

  const existing = await prisma.teamMember.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error('Team member not found');

  const requestedSlug = slugify(input.slug ?? '') || slugifyWithFallback(input.name, 'member');

  const member = await withUniqueSlug(
    requestedSlug,
    requestedSlug === existing.slug ? async () => false : slugIsTaken(input.id),
    (slug) => prisma.teamMember.update({ where: { id: input.id }, data: { slug, ...memberFields(input) } })
  );

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
  if (existing.slug !== member.slug) revalidatePath(`/team/${existing.slug}`);
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
