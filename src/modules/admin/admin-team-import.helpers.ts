import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export const teamImportItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  designation: z.string().min(1, 'Designation is required'),
  shortBio: z.string().nullable().optional(),
  biography: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')).or(z.literal(null)),
  linkedinUrl: z.string().url().nullable().optional().or(z.literal('')).or(z.literal(null)),
  facebookUrl: z.string().url().nullable().optional().or(z.literal('')).or(z.literal(null)),
  websiteUrl: z.string().url().nullable().optional().or(z.literal('')).or(z.literal(null)),
  instagramUrl: z.string().url().nullable().optional().or(z.literal('')).or(z.literal(null)),
  qualifications: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  achievements: z.string().nullable().optional(),
  practiceAreas: z.string().nullable().optional(),
  languages: z.string().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
});

export type TeamImportItem = z.infer<typeof teamImportItemSchema>;

export function extractPhotoFilename(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const parts = imageUrl.split('/');
  return parts[parts.length - 1] || null;
}

export function loadTeamBackupData(): TeamImportItem[] {
  const filePath = path.join(process.cwd(), 'team_members_backup.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('Local backup file team_members_backup.json not found');
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const rawData = JSON.parse(content);
  if (!Array.isArray(rawData)) {
    throw new Error('Invalid backup format: expected array of team member profiles');
  }
  return rawData.map((item) => teamImportItemSchema.parse(item));
}
