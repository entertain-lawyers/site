import { z } from 'zod';
import { isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE } from '@/lib/url-validation';

const externalProfileUrl = z.string().url().refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Enter a valid http or https URL');
const phoneNumber = z.string().trim().max(25).regex(/^\+?[\d\s().-]+$/, 'Enter a valid phone number')
  .refine((value) => value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15, 'Enter a valid phone number');

/**
 * Kept out of the `'use server'` action module: Next.js only allows async
 * function exports from those files, and the form/tests import this schema.
 */
export const consultationLawyerSchema = z.object({
  name: z.string().min(1, 'Advocate name is required').max(150),
  slug: z.string().optional(),
  title: z.string().min(1, 'Title / Designation is required').default('Advocate'),
  licenseNumber: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  practiceAreas: z.string().optional().nullable(),
  courtJurisdiction: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  languages: z.string().optional().nullable(),
  phone: phoneNumber.optional().nullable().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  whatsappNumber: phoneNumber.optional().nullable().or(z.literal('')),
  location: z.string().optional().nullable(),
  serviceCities: z.string().max(500).optional().nullable(),
  lawFirm: z.string().max(200).optional().nullable(),
  officeAddress: z.string().max(500).optional().nullable(),
  officeMapUrl: externalProfileUrl.optional().nullable().or(z.literal('')),
  facebookUrl: externalProfileUrl.optional().nullable().or(z.literal('')),
  instagramUrl: externalProfileUrl.optional().nullable().or(z.literal('')),
  linkedInUrl: externalProfileUrl.optional().nullable().or(z.literal('')),
  websiteUrl: externalProfileUrl.optional().nullable().or(z.literal('')),
  achievements: z.string().max(5000).optional().nullable(),
  shortBio: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  imageUrl: z.string().refine(isSafeAssetUrl, SAFE_ASSET_URL_MESSAGE).optional().nullable(),
  rating: z.number().min(1).max(5).default(5.0),
  displayOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});
