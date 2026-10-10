import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

export const s3Client = new S3Client({
  region: "auto",
  endpoint: env.B2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.B2_ACCESS_KEY_ID || "",
    secretAccessKey: env.B2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Generates a short-lived presigned GET URL for secure document delivery.
 */
export async function generatePresignedGetUrl(storageKey: string, expiresInSeconds: number = 300) {
  const command = new GetObjectCommand({
    Bucket: env.B2_BUCKET_NAME || "",
    Key: storageKey,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generates a short-lived presigned PUT URL for admin document uploads.
 */
export async function generatePresignedPutUrl(storageKey: string, mimeType: string, expiresInSeconds: number = 600) {
  const command = new PutObjectCommand({
    Bucket: env.B2_BUCKET_NAME || "",
    Key: storageKey,
    ContentType: mimeType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Validates the existence of an object in B2 and returns its metadata.
 */
export async function getObjectMetadata(storageKey: string) {
  const command = new HeadObjectCommand({
    Bucket: env.B2_BUCKET_NAME || "",
    Key: storageKey,
  });
  return s3Client.send(command);
}

/**
 * Fetches the first N bytes of an object from B2 (e.g., to check magic bytes).
 */
export async function getObjectHeadBytes(storageKey: string, numBytes: number = 4): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.B2_BUCKET_NAME || "",
    Key: storageKey,
    Range: `bytes=0-${numBytes - 1}`,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error("Failed to read object body from B2");
  }

  // Convert stream to buffer
  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('ascii');
}
