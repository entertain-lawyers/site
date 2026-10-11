import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const prisma = new PrismaClient();

const teamImportItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  designation: z.string().min(1),
  shortBio: z.string().nullable().optional(),
  biography: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  qualifications: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  achievements: z.string().nullable().optional(),
  practiceAreas: z.string().nullable().optional(),
  languages: z.string().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
});

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const publishFlag = args.includes('--publish');

  console.log(`=== BULK TEAM PROFILE IMPORTER [${isLive ? 'LIVE MODE' : 'DRY RUN'}] ===\n`);

  const backupPath = path.join(process.cwd(), 'team_members_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`ERROR: Backup file ${backupPath} not found.`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const items = raw.map((item: any) => teamImportItemSchema.parse(item));
  const photosDir = path.join(process.cwd(), 'public/uploads/editorial/team');

  console.log(`Loaded ${items.length} profiles from ${backupPath}\n`);

  const report = [];

  for (const item of items) {
    const filename = item.imageUrl?.split('/').pop() || null;
    let photoExists = false;
    let photoSize = 0;

    if (filename) {
      const pPath = path.join(photosDir, filename);
      if (fs.existsSync(pPath)) {
        photoExists = true;
        photoSize = fs.statSync(pPath).size;
      }
    }

    const existing = await prisma.teamMember.findFirst({
      where: {
        OR: [
          ...(item.id ? [{ id: item.id }] : []),
          { slug: item.slug },
        ],
      },
    });

    report.push({
      name: item.name,
      slug: item.slug,
      designation: item.designation,
      photo: filename,
      photoExists,
      photoSize: photoExists ? `${(photoSize / 1024).toFixed(1)} KB` : 'MISSING',
      targetPublicUrl: filename ? `/api/media/editorial/team/${filename}` : 'None',
      dbStatus: existing ? 'EXISTS (Will Update)' : 'NEW (Will Create)',
      hasAchievements: !!item.achievements,
      hasInstagram: !!item.instagramUrl,
    });
  }

  console.table(report);

  if (!isLive) {
    console.log('\nDRY RUN complete. No database mutations or S3 uploads were executed.');
    console.log('To perform live import, re-run with: npx tsx scripts/bulk-import-team.ts --live\n');
    return;
  }

  // Live execution
  let s3Client: S3Client | null = null;
  if (
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
    console.log('B2 S3 Client configured for photo uploads.');
  } else {
    console.log('B2 credentials not present; skipping remote photo upload.');
  }

  let created = 0;
  let updated = 0;
  let uploaded = 0;

  for (const item of items) {
    const filename = item.imageUrl?.split('/').pop() || null;
    let targetImageUrl = filename ? `/api/media/editorial/team/${filename}` : null;

    if (filename && s3Client && process.env.B2_BUCKET_NAME) {
      const pPath = path.join(photosDir, filename);
      if (fs.existsSync(pPath)) {
        const body = fs.readFileSync(pPath);
        const key = `editorial/team/${filename}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: 'image/jpeg',
          })
        );
        console.log(`Uploaded photo to B2: ${key}`);
        uploaded++;
      }
    }

    const existing = await prisma.teamMember.findFirst({
      where: {
        OR: [
          ...(item.id ? [{ id: item.id }] : []),
          { slug: item.slug },
        ],
      },
    });

    const data = {
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
      isPublished: publishFlag ? true : false,
    };

    if (existing) {
      await prisma.teamMember.update({
        where: { id: existing.id },
        data,
      });
      console.log(`Updated profile: ${item.name} (${item.slug})`);
      updated++;
    } else {
      await prisma.teamMember.create({
        data: {
          ...(item.id ? { id: item.id } : {}),
          ...data,
        },
      });
      console.log(`Created profile: ${item.name} (${item.slug})`);
      created++;
    }
  }

  console.log(`\nImport Summary: ${created} created, ${updated} updated, ${uploaded} photos uploaded to B2.`);
}

main()
  .catch((err) => {
    console.error('Fatal import error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
