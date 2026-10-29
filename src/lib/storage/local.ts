import { StorageAdapter } from './index';
import crypto from 'crypto';
import { env } from '@/env';

// DEVELOPMENT ONLY: Cryptographically signed, purpose-bound, expiring tokens.
// This replaces the in-memory Map to natively support Next.js App Router multi-worker environments (Turbopack/Server Actions vs API Routes).

export class LocalStorageAdapter implements StorageAdapter {
  async generateUploadUrl(key: string, mimeType: string, expiresInSeconds: number = 600, userId?: string, _size?: number): Promise<string> {
    if (!userId) throw new Error("userId required for local storage intents");

    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = JSON.stringify({ key, mimeType, expiresAt, userId });
    const payloadBase64 = Buffer.from(payload).toString('base64url');

    const signature = crypto
      .createHmac('sha256', env.AUTH_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const token = `${payloadBase64}.${signature}`;

    return `/api/admin/media/local-upload-proxy?token=${token}`;
  }

  async verifyUpload(key: string): Promise<boolean> {
    return true;
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
