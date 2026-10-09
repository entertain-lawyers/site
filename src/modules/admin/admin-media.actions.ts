'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { mediaStorage } from '@/lib/storage';
import crypto from 'crypto';

const MEDIA_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;

const initiateMediaUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().positive().max(10 * 1024 * 1024, "Image must be under 10MB"), // 10MB limit
  type: z.enum(['POST', 'EVENT', 'GALLERY', 'PUBLICATION', 'RICH_TEXT', 'TEAM']),
});

export const initiateMediaUploadAction = createSafeAction(async (args: z.infer<typeof initiateMediaUploadSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  const parsed = initiateMediaUploadSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid upload request');
  }

  const input = parsed.data;

  // Generate a secure, unguessable key
  const ext = MEDIA_MIME_EXTENSIONS[input.mimeType];
  const uuid = crypto.randomUUID();
  const dateStr = new Date().toISOString().split('T')[0];

  // Logical prefix routing based on feature type
  let prefix = 'misc';
  if (input.type === 'POST') prefix = 'posts';
  else if (input.type === 'EVENT') prefix = 'events';
  else if (input.type === 'GALLERY') prefix = 'gallery';
  else if (input.type === 'PUBLICATION') prefix = 'publications';
  else if (input.type === 'RICH_TEXT') prefix = 'rich-text';
  else if (input.type === 'TEAM') prefix = 'team';

  const key = `editorial/${prefix}/${dateStr}-${uuid}.${ext}`;

  // Generate the upload URL
  const uploadUrl = await mediaStorage.generateUploadUrl(key, input.mimeType, 300, session.userId);

  // We do NOT use UploadIntent table here because editorial images don't require
  // strict rollback transactions like Private Documents.
  // If an editor abandons an upload, it's just an orphaned file in R2, which is acceptable for Batch 3.

  return {
    uploadUrl,
    key,
    publicUrl: mediaStorage.getPublicUrl(key),
  };
});
