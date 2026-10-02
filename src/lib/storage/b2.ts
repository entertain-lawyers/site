import { StorageAdapter } from './index';
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

// Reusing the existing credentials but pointing to the B2 bucket
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
  },
});

export class B2StorageAdapter implements StorageAdapter {
  async generateUploadUrl(key: string, mimeType: string, expiresInSeconds: number = 600, userId?: string): Promise<string> {
    const bucket = process.env.B2_BUCKET_NAME;
    if (!bucket) throw new Error("B2_BUCKET_NAME is not configured");

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  }

  async verifyUpload(key: string): Promise<boolean> {
    const bucket = process.env.B2_BUCKET_NAME;
    if (!bucket) return false;

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    try {
      await s3Client.send(command);
      return true;
    } catch (e) {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    // We safely return an internal proxy path because the bucket is PRIVATE.
    // Ensure the key doesn't begin with a slash.
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    return `/api/media/${cleanKey}`;
  }
}
