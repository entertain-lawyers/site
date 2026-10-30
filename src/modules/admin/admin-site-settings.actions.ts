'use server';

import { createSafeAction, parseOrThrow } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isUniqueConstraintError } from '@/lib/prisma-errors';
import {
  HOMEPAGE_CONFIG_ID,
  SITE_SETTINGS_ID,
} from '@/lib/site-settings';
import {
  normalizePath,
  redirectIdSchema,
  redirectSchema,
  updateRedirectSchema,
} from '@/lib/redirect-rules';

/**
 * WordPress-style site control actions. Only ADMIN can change global settings,
 * homepage copy or redirects; every change is written to the audit log.
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

const optionalLink = (max = 1000) =>
  optionalText(max).refine(
    (value) => !value || value.startsWith('/') || /^https?:\/\//i.test(value),
    'Link must start with / or http(s)://'
  );

const siteSettingsSchema = z.object({
  organizationName: z.string().trim().min(1, 'Organisation name is required').max(120),
  contactEmail: z.string().trim().email('Enter a valid email address').max(200),
  contactPhone: z.string().trim().min(3, 'Enter a contact phone number').max(40),
  address: z.string().trim().min(1, 'Enter an address').max(300),
  facebookUrl: optionalLink(500),
  twitterUrl: optionalLink(500),
  instagramUrl: optionalLink(500),
  youtubeUrl: optionalLink(500),
  footerCopyright: optionalText(500),
});

const homepageSchema = z.object({
  heroHeading: z.string().trim().min(1, 'Hero heading is required').max(200),
  heroSubheading: optionalText(600),
  heroCtaText: optionalText(80),
  heroCtaLink: optionalLink(500),
  announcementText: optionalText(300),
  announcementLink: optionalLink(500),
});

function requireAdmin(role?: Role) {
  if (role !== Role.ADMIN) throw new Error('Unauthorized: Admin access required.');
}

function toNull(value: string | undefined) {
  return value && value.trim() ? value.trim() : null;
}

export const updateSiteSettingsAction = createSafeAction(
  async (args: z.infer<typeof siteSettingsSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(siteSettingsSchema, args);

    const data = {
      organizationName: input.organizationName.trim(),
      contactEmail: input.contactEmail.trim(),
      contactPhone: input.contactPhone.trim(),
      address: input.address.trim(),
      facebookUrl: toNull(input.facebookUrl),
      twitterUrl: toNull(input.twitterUrl),
      instagramUrl: toNull(input.instagramUrl),
      youtubeUrl: toNull(input.youtubeUrl),
      footerCopyright: toNull(input.footerCopyright),
    };

    await prisma.globalSettings.upsert({
      where: { id: SITE_SETTINGS_ID },
      create: { id: SITE_SETTINGS_ID, ...data },
      update: data,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'UPDATE',
        entityType: 'GlobalSettings',
        entityId: SITE_SETTINGS_ID,
        details: { updatedFields: Object.keys(data) },
      },
    });

    // Refresh the public shell (footer, contact page, JSON-LD) and the form.
    revalidatePath('/', 'layout');
    revalidatePath('/contact');
    revalidatePath('/admin/settings');

    return { success: true };
  },
  { requireAdmin: true }
);

export const updateHomepageConfigAction = createSafeAction(
  async (args: z.infer<typeof homepageSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(homepageSchema, args);

    const data = {
      heroHeading: input.heroHeading.trim(),
      heroSubheading: toNull(input.heroSubheading),
      heroCtaText: toNull(input.heroCtaText),
      heroCtaLink: toNull(input.heroCtaLink),
      announcementText: toNull(input.announcementText),
      announcementLink: toNull(input.announcementLink),
    };

    await prisma.homepageConfig.upsert({
      where: { id: HOMEPAGE_CONFIG_ID },
      create: { id: HOMEPAGE_CONFIG_ID, ...data },
      update: data,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'UPDATE',
        entityType: 'HomepageConfig',
        entityId: HOMEPAGE_CONFIG_ID,
        details: { updatedFields: Object.keys(data) },
      },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/homepage');

    return { success: true };
  },
  { requireAdmin: true }
);

export const createRedirectAction = createSafeAction(
  async (args: z.infer<typeof redirectSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(redirectSchema, args);

    const source = normalizePath(input.source);

    const existing = await prisma.redirect.findUnique({ where: { source } });
    if (existing) throw new Error('A redirect for this path already exists');

    const redirect = await prisma.redirect.create({
      data: {
        source,
        destination: input.destination.trim(),
        statusCode: input.statusCode,
        isActive: input.isActive,
        notes: toNull(input.notes),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'CREATE',
        entityType: 'Redirect',
        entityId: redirect.id,
        details: { source, destination: redirect.destination, statusCode: redirect.statusCode },
      },
    });

    revalidatePath('/admin/redirects');
    return { id: redirect.id };
  },
  { requireAdmin: true }
);

export const updateRedirectAction = createSafeAction(
  async (args: z.infer<typeof updateRedirectSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(updateRedirectSchema, args);

    const existing = await prisma.redirect.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error('Redirect not found');

    const source = normalizePath(input.source);

    if (source !== existing.source) {
      const duplicate = await prisma.redirect.findUnique({ where: { source } });
      if (duplicate) throw new Error('A redirect for this path already exists');
    }

    try {
      await prisma.redirect.update({
        where: { id: input.id },
        data: {
          source,
          destination: input.destination.trim(),
          statusCode: input.statusCode,
          isActive: input.isActive,
          notes: toNull(input.notes),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('A redirect for this path already exists');
      }
      throw error;
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'UPDATE',
        entityType: 'Redirect',
        entityId: input.id,
        details: { source, destination: input.destination.trim() },
      },
    });

    revalidatePath('/admin/redirects');
    return { success: true };
  },
  { requireAdmin: true }
);

export const deleteRedirectAction = createSafeAction(
  async (args: z.infer<typeof redirectIdSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(redirectIdSchema, args);

    const existing = await prisma.redirect.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error('Redirect not found');

    await prisma.redirect.delete({ where: { id: input.id } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'DELETE',
        entityType: 'Redirect',
        entityId: existing.id,
        details: { source: existing.source, destination: existing.destination },
      },
    });

    revalidatePath('/admin/redirects');
    return { success: true };
  },
  { requireAdmin: true }
);

export const toggleRedirectAction = createSafeAction(
  async (args: z.infer<typeof redirectIdSchema>, session) => {
    requireAdmin(session.role);
    const input = parseOrThrow(redirectIdSchema, args);

    const existing = await prisma.redirect.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error('Redirect not found');

    const isActive = !existing.isActive;
    await prisma.redirect.update({ where: { id: input.id }, data: { isActive } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId!,
        action: 'UPDATE',
        entityType: 'Redirect',
        entityId: existing.id,
        details: { source: existing.source, isActive },
      },
    });

    revalidatePath('/admin/redirects');
    return { isActive };
  },
  { requireAdmin: true }
);
