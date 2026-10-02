'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { mediaStorage } from '@/lib/storage';
import crypto from 'crypto';

const initiateMediaUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().max(10 * 1024 * 1024, "Image must be under 10MB"), // 10MB limit
  type: z.enum(['POST', 'EVENT', 'GALLERY', 'PUBLICATION', 'RICH_TEXT']),
});

export const initiateMediaUploadAction = createSafeAction(async (args: z.infer<typeof initiateMediaUploadSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized');
  }

  // Generate a secure, unguessable key
  const ext = args.filename.split('.').pop()?.toLowerCase() || 'jpg';
  const uuid = crypto.randomUUID();
  const dateStr = new Date().toISOString().split('T')[0];

  // Logical prefix routing based on feature type
  let prefix = 'misc';
  if (args.type === 'POST') prefix = 'posts';
  else if (args.type === 'EVENT') prefix = 'events';
  else if (args.type === 'GALLERY') prefix = 'gallery';
  else if (args.type === 'PUBLICATION') prefix = 'publications';
  else if (args.type === 'RICH_TEXT') prefix = 'rich-text';

  const key = `editorial/${prefix}/${dateStr}-${uuid}.${ext}`;

  // Generate the upload URL
  const uploadUrl = await mediaStorage.generateUploadUrl(key, args.mimeType, 300, session.userId);

  // We do NOT use UploadIntent table here because editorial images don't require
  // strict rollback transactions like Private Documents.
  // If an editor abandons an upload, it's just an orphaned file in R2, which is acceptable for Batch 3.

  return {
    uploadUrl,
    key,
    publicUrl: mediaStorage.getPublicUrl(key),
  };
});
