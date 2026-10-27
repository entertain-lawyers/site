import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Destructive integration suites run against a disposable database only.
 * Point TEST_DATABASE_URL at one to enable them; otherwise they are skipped.
 * See src/test/db.ts.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: {
      SKIP_ENV_VALIDATION: '1',
      // Provider secrets must exist before the modules are imported; the tests
      // previously set them after import, so `env` had already been parsed.
      ESEWA_SECRET_KEY: '8gBm/:&EnhH.1/q',
      ESEWA_MERCHANT_CODE: 'EPAYTEST',
      ESEWA_PRODUCT_CODE: 'EPAYTEST',
      KHALTI_SECRET_KEY: 'test_secret_key',
      ...(testDatabaseUrl
        ? { DATABASE_URL: testDatabaseUrl, DIRECT_URL: testDatabaseUrl }
        : {}),
    },
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    environment: 'node',
    server: {
      deps: {
        // next-auth is ESM and imports the extensionless `next/server` entry,
        // which Node cannot resolve. Inlining lets Vite apply the alias below.
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': require.resolve('next/server.js'),
    },
  },
});
