import { LocalStorageAdapter } from './local';
import { B2StorageAdapter } from './b2';

export interface StorageAdapter {
  generateUploadUrl(key: string, mimeType: string, expiresIn?: number, userId?: string, size?: number): Promise<string>;
  verifyUpload(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}

/**
 * Resolved lazily so a boot without storage credentials does not crash every
 * process that merely imports this module — the value is only needed once a
 * upload/download actually touches mediaStorage.
 *
 * Selection: STORAGE_ENABLED='true' opts a non-production environment (e.g.
 * staging) into real B2 storage; 'false' is advisory (module itself no-ops
 * when the flag is read) and never overrides production behaviour.
 */
let mediaStorageInstance: StorageAdapter | null = null;

function getMediaStorage(): StorageAdapter {
  if (mediaStorageInstance) return mediaStorageInstance;
  return (mediaStorageInstance = createMediaStorage());
}

function createMediaStorage(): StorageAdapter {
  // The STORAGE_ENABLED flag must agree with what the adapter actually does:
  // an operator who explicitly set it to 'false' intends storage to be OFF,
  // so fail loudly instead of silently writing to B2 anyway. (Unset or
  // 'true' changes nothing: production always uses B2.)
  if (process.env.STORAGE_ENABLED === 'false' && process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: STORAGE_ENABLED=false but production requires storage. Set B2 credentials and STORAGE_ENABLED=true.');
  }

  // Production always uses B2: credentials are validated by src/env.ts.
  // NODE_ENV cannot be non-production here in a production deployment.
  if (process.env.NODE_ENV === 'production') {
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

/** Lazily-initialised module access point; never eager at import time. */
export function getStorage(): StorageAdapter {
  return getMediaStorage();
}

export const mediaStorage: StorageAdapter = {
  generateUploadUrl: (key, mimeType, expiresIn, userId, size) =>
    getStorage().generateUploadUrl(key, mimeType, expiresIn, userId, size),
  verifyUpload: (key) => getStorage().verifyUpload(key),
  getPublicUrl: (key) => getStorage().getPublicUrl(key),
};
