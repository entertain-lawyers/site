import { env } from '@/env';
import { LocalStorageAdapter } from './local';
import { B2StorageAdapter } from './b2';

export interface StorageAdapter {
  generateUploadUrl(key: string, mimeType: string, expiresIn?: number, userId?: string, size?: number): Promise<string>;
  verifyUpload(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}

function getMediaStorage(): StorageAdapter {
  if (env.NODE_ENV === 'production') {
    const requiredVars = [
      'B2_ENDPOINT',
      'B2_ACCESS_KEY_ID',
      'B2_SECRET_ACCESS_KEY',
      'B2_BUCKET_NAME'
    ];

    for (const v of requiredVars) {
      if (!process.env[v]) {
        throw new Error(`CRITICAL: Production storage configuration missing required environment variable: ${v}`);
      }
    }

    return new B2StorageAdapter();
  }

  return new LocalStorageAdapter();
}

export const mediaStorage: StorageAdapter = getMediaStorage();
