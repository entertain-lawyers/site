import { StorageAdapter } from './index';
import crypto from 'crypto';

// DEVELOPMENT ONLY: In-memory store for upload intents.
// Production uses stateless R2 presigned URLs.
export const localUploadIntents = new Map<string, {
  key: string;
  mimeType: string;
  expiresAt: number;
  userId: string;
}>();

export class LocalStorageAdapter implements StorageAdapter {
  async generateUploadUrl(key: string, mimeType: string, expiresInSeconds: number = 600, userId?: string): Promise<string> {
    if (!userId) throw new Error("userId required for local storage intents");

    const token = crypto.randomBytes(32).toString('hex');
    localUploadIntents.set(token, {
      key,
      mimeType,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      userId
    });

    return `/api/admin/media/local-upload-proxy?token=${token}`;
  }

  async verifyUpload(key: string): Promise<boolean> {
    return true;
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
