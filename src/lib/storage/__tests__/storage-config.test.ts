import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMediaStorage, getStorage, resetStorageInstanceForTesting } from '../index';
import { LocalStorageAdapter } from '../local';
import { B2StorageAdapter } from '../b2';

describe('Storage Configuration Contract', () => {
  const originalEnv = { ...process.env };

  const validB2Env = {
    B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
    B2_ACCESS_KEY_ID: 'test-key-id',
    B2_SECRET_ACCESS_KEY: 'test-secret-key',
    B2_BUCKET_NAME: 'test-bucket',
  };

  function setNodeEnv(env: string) {
    (process.env as Record<string, string | undefined>).NODE_ENV = env;
  }

  beforeEach(() => {
    resetStorageInstanceForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetStorageInstanceForTesting();
  });

  it('Case 1: Development/test with STORAGE_ENABLED=false (or unset) selects LocalStorageAdapter', () => {
    setNodeEnv('development');
    process.env.STORAGE_ENABLED = 'false';

    const adapter = createMediaStorage();
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);

    // Also verify unset STORAGE_ENABLED
    delete process.env.STORAGE_ENABLED;
    const adapterUnset = createMediaStorage();
    expect(adapterUnset).toBeInstanceOf(LocalStorageAdapter);
  });

  it('Case 2: Development/test with STORAGE_ENABLED=true selects B2StorageAdapter when credentials provided', () => {
    setNodeEnv('development');
    process.env.STORAGE_ENABLED = 'true';
    Object.assign(process.env, validB2Env);

    const adapter = createMediaStorage();
    expect(adapter).toBeInstanceOf(B2StorageAdapter);
  });

  it('Case 2b: Development/test with STORAGE_ENABLED=true fails clearly when B2 credentials missing', () => {
    setNodeEnv('development');
    process.env.STORAGE_ENABLED = 'true';
    delete process.env.B2_ENDPOINT;
    delete process.env.B2_ACCESS_KEY_ID;
    delete process.env.B2_SECRET_ACCESS_KEY;
    delete process.env.B2_BUCKET_NAME;

    expect(() => createMediaStorage()).toThrowError(
      /CRITICAL: Storage is enabled \(STORAGE_ENABLED=true\) but missing required B2 configuration: B2_ENDPOINT, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET_NAME/
    );
  });

  it('Case 3: Staging/production deployment with STORAGE_ENABLED=true selects B2StorageAdapter', () => {
    setNodeEnv('production');
    process.env.STORAGE_ENABLED = 'true';
    Object.assign(process.env, validB2Env);

    const adapter = createMediaStorage();
    expect(adapter).toBeInstanceOf(B2StorageAdapter);
  });

  it('Case 4: Production with STORAGE_ENABLED=false or unset fails configuration validation clearly', () => {
    setNodeEnv('production');
    process.env.STORAGE_ENABLED = 'false';

    expect(() => createMediaStorage()).toThrowError(
      /CRITICAL: Production requires storage to be enabled. Set STORAGE_ENABLED=true and configure B2 credentials/
    );

    // Also verify unset in production
    delete process.env.STORAGE_ENABLED;
    expect(() => createMediaStorage()).toThrowError(
      /CRITICAL: Production requires storage to be enabled. Set STORAGE_ENABLED=true and configure B2 credentials/
    );
  });

  it('never prints secrets in logs or error messages when validation fails', () => {
    setNodeEnv('production');
    process.env.STORAGE_ENABLED = 'true';
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    process.env.B2_ACCESS_KEY_ID = 'test-key-id';
    // B2_SECRET_ACCESS_KEY missing
    delete process.env.B2_SECRET_ACCESS_KEY;
    process.env.B2_BUCKET_NAME = 'test-bucket';

    try {
      createMediaStorage();
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('B2_SECRET_ACCESS_KEY');
      expect(message).not.toContain('test-secret-key');
    }
  });

  it('lazy initialization: getStorage() instantiates only on call', () => {
    setNodeEnv('development');
    process.env.STORAGE_ENABLED = 'false';

    const adapter1 = getStorage();
    expect(adapter1).toBeInstanceOf(LocalStorageAdapter);

    // Repeated call returns the cached instance
    const adapter2 = getStorage();
    expect(adapter2).toBe(adapter1);
  });
});
