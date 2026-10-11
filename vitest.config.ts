import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    env: {
      SKIP_ENV_VALIDATION: '1',
    },
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': require.resolve('next/server.js'),
    },
  },
});
