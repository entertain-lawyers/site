import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
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
