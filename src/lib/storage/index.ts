import { LocalStorageAdapter } from './local';
import { B2StorageAdapter } from './b2';

export interface StorageAdapter {
  generateUploadUrl(key: string, mimeType: string, expiresIn?: number, userId?: string, size?: number): Promise<string>;
  verifyUpload(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}

/**
 * Resolved lazily so a boot without storage credentials does not crash every
 * process that merely imports this module — the value is only needed once an
 * upload/download actually touches mediaStorage.
 *
 * Configuration contract:
 * - Development/test with STORAGE_ENABLED='false' (or unset): LocalStorageAdapter
 * - Development/test with STORAGE_ENABLED='true': B2StorageAdapter (requires B2 credentials)
 * - Staging/production deployment with STORAGE_ENABLED='true': B2StorageAdapter (requires B2 credentials)
 * - Production with STORAGE_ENABLED='false' (or unset): fails loudly with configuration error
 */
let mediaStorageInstance: StorageAdapter | null = null;

export function resetStorageInstanceForTesting(): void {
  mediaStorageInstance = null;
}

function getMediaStorage(): StorageAdapter {
  if (mediaStorageInstance) return mediaStorageInstance;
  return (mediaStorageInstance = createMediaStorage());
}

export function createMediaStorage(): StorageAdapter {
  const isProd = process.env.NODE_ENV === 'production';
  const isStorageEnabled = process.env.STORAGE_ENABLED === 'true';

  // Production requires storage to be explicitly enabled (STORAGE_ENABLED=true).
  // Never silently fall back to local disk storage in production.
  if (isProd && !isStorageEnabled) {
    throw new Error(
      'CRITICAL: Production requires storage to be enabled. Set STORAGE_ENABLED=true and configure B2 credentials (B2_ENDPOINT, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET_NAME).'
    );
  }

  // If storage is enabled (in production, staging, or dev/test opt-in), validate required B2 credentials.
  if (isStorageEnabled) {
    const requiredVars = [
      'B2_ENDPOINT',
      'B2_ACCESS_KEY_ID',
      'B2_SECRET_ACCESS_KEY',
      'B2_BUCKET_NAME',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(
        `CRITICAL: Storage is enabled (STORAGE_ENABLED=true) but missing required B2 configuration: ${missing.join(', ')}`
      );
    }

    return new B2StorageAdapter();
  }

  // Non-production with storage disabled uses local filesystem storage.
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
