'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  loadTeamBackupData,
  extractPhotoFilename,
} from './admin-team-import.helpers';

const executeTeamImportSchema = z.object({
  uploadPhotosToStorage: z.boolean().default(true),
  forcePublish: z.boolean().default(false), // Strict restriction: default to unpublished (false)
});

export const previewTeamImportAction = createSafeAction(async (_args: void, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) {
    throw new Error('Unauthorized: Admin or Editor access required');
  }

  const items = loadTeamBackupData();
  const photosDir = path.join(process.cwd(), 'public/uploads/editorial/team');

  const previews = await Promise.all(
    items.map(async (item) => {
      const photoFilename = extractPhotoFilename(item.imageUrl);
      let photoExistsLocally = false;
      let photoSizeBytes = 0;

      if (photoFilename) {
        const photoPath = path.join(photosDir, photoFilename);
        if (fs.existsSync(photoPath)) {
          photoExistsLocally = true;
          const stat = fs.statSync(photoPath);
          photoSizeBytes = stat.size;
        }
      }

      // Check DB for existing profile by ID or slug
      const existing = await prisma.teamMember.findFirst({
        where: {
          OR: [
            ...(item.id ? [{ id: item.id }] : []),
            { slug: item.slug },
          ],
        },
      });

      const targetB2Key = photoFilename ? `editorial/team/${photoFilename}` : null;
      const targetPublicUrl = photoFilename ? `/api/media/editorial/team/${photoFilename}` : null;

      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        designation: item.designation,
        shortBio: item.shortBio,
        biography: item.biography,
        qualifications: item.qualifications,
        experience: item.experience,
        achievements: item.achievements,
        instagramUrl: item.instagramUrl,
        linkedinUrl: item.linkedinUrl,
        facebookUrl: item.facebookUrl,
        displayOrder: item.displayOrder,
        isPublished: item.isPublished,
        photoFilename,
        photoExistsLocally,
        photoSizeBytes,
        targetB2Key,
        targetPublicUrl,
        status: existing ? ('EXISTS_IN_DB' as const) : ('NEW_RECORD' as const),
        existingRecordId: existing?.id,
        currentDbImageUrl: existing?.imageUrl,
      };
    })
  );

  const existingInDbCount = previews.filter((p) => p.status === 'EXISTS_IN_DB').length;
  const newRecordsCount = previews.filter((p) => p.status === 'NEW_RECORD').length;
  const localPhotosFoundCount = previews.filter((p) => p.photoExistsLocally).length;
  const localPhotosMissingCount = previews.filter((p) => !p.photoExistsLocally).length;

  return {
    total: previews.length,
    existingInDbCount,
    newRecordsCount,
    localPhotosFoundCount,
    localPhotosMissingCount,
    items: previews,
  };
});

export const executeTeamImportAction = createSafeAction(
  async (args: z.infer<typeof executeTeamImportSchema>, session) => {
    if (session.role !== Role.ADMIN) {
      throw new Error('Unauthorized: Admin access required to execute bulk team import');
    }

    const { uploadPhotosToStorage, forcePublish } = executeTeamImportSchema.parse(args);
    const items = loadTeamBackupData();
    const photosDir = path.join(process.cwd(), 'public/uploads/editorial/team');

    let createdCount = 0;
    let updatedCount = 0;
    let photosUploadedCount = 0;
    const errors: string[] = [];

    // Initialize S3 client for B2 if credentials are provided
    let s3Client: S3Client | null = null;
    if (
      uploadPhotosToStorage &&
      process.env.B2_ENDPOINT &&
      process.env.B2_ACCESS_KEY_ID &&
      process.env.B2_SECRET_ACCESS_KEY &&
      process.env.B2_BUCKET_NAME
    ) {
      s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.B2_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.B2_ACCESS_KEY_ID,
          secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
        },
      });
    }

    for (const item of items) {
      try {
        const photoFilename = extractPhotoFilename(item.imageUrl);
        let targetImageUrl: string | null = null;

        if (photoFilename) {
          const photoPath = path.join(photosDir, photoFilename);
          if (fs.existsSync(photoPath)) {
            // Upload to B2 if client is configured
            if (s3Client && process.env.B2_BUCKET_NAME) {
              const fileBuffer = fs.readFileSync(photoPath);
              const key = `editorial/team/${photoFilename}`;
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: process.env.B2_BUCKET_NAME,
                  Key: key,
                  Body: fileBuffer,
                  ContentType: 'image/jpeg',
                })
              );
              photosUploadedCount++;
            }
            // Always assign standard B2 proxy URL, never local /uploads/ path in DB
            targetImageUrl = `/api/media/editorial/team/${photoFilename}`;
          } else {
            errors.push(`Local photo missing for ${item.name}: ${photoFilename}`);
          }
        }

        // Check if existing
        const existing = await prisma.teamMember.findFirst({
          where: {
            OR: [
              ...(item.id ? [{ id: item.id }] : []),
              { slug: item.slug },
            ],
          },
        });

        const profileData = {
          name: item.name,
          slug: item.slug,
          designation: item.designation,
          shortBio: item.shortBio || null,
          biography: item.biography || null,
          imageUrl: targetImageUrl || existing?.imageUrl || null,
          phone: item.phone || null,
          email: item.email || null,
          linkedinUrl: item.linkedinUrl || null,
          facebookUrl: item.facebookUrl || null,
          websiteUrl: item.websiteUrl || null,
          instagramUrl: item.instagramUrl || null,
          qualifications: item.qualifications || null,
          experience: item.experience || null,
          achievements: item.achievements || null,
          practiceAreas: item.practiceAreas || null,
          languages: item.languages || null,
          displayOrder: item.displayOrder,
          // Respect restriction: profiles remain unpublished (false) unless explicit forcePublish is granted
          isPublished: forcePublish ? true : false,
        };

        let resultId: string;
        if (existing) {
          const updated = await prisma.teamMember.update({
            where: { id: existing.id },
            data: profileData,
          });
          resultId = updated.id;
          updatedCount++;
        } else {
          const created = await prisma.teamMember.create({
            data: {
              ...(item.id ? { id: item.id } : {}),
              ...profileData,
            },
          });
          resultId = created.id;
          createdCount++;
        }

        // Audit log
        if (session.userId) {
          await prisma.auditLog.create({
            data: {
              userId: session.userId,
              action: existing ? 'UPDATE' : 'CREATE',
              entityType: 'TEAM_MEMBER',
              entityId: resultId,
              details: {
                name: item.name,
                slug: item.slug,
                isBulkImport: true,
                photoUploaded: !!s3Client && !!photoFilename,
                isPublished: profileData.isPublished,
              },
            },
          });
        }
      } catch (err: any) {
        errors.push(`Error processing ${item.name}: ${err.message}`);
      }
    }

    revalidatePath('/team');
    revalidatePath('/admin/team');

    return {
      success: errors.length === 0,
      total: items.length,
      createdCount,
      updatedCount,
      photosUploadedCount,
      errors,
    };
  }
);
