import { defineConfig, devices } from '@playwright/test';

/**
 * Admin Rich Text Editor regression suite (full-height writing workspace +
 * internal scrolling). It drives a real browser through the normal editor
 * paste/save flows, which write through the server actions — so it must only
 * ever run against a disposable environment (local dev server backed by a
 * local or mock WordPress install), never production WordPress.
 *
 *   EDITOR_E2E=1 TEST_EDITOR_EMAIL=... TEST_EDITOR_PASSWORD=... npm run test:editor
 *
 * The suite skips itself unless EDITOR_E2E=1 and a test account are provided.
 */
const enabled = process.env.EDITOR_E2E === '1';

export default defineConfig({
  testDir: './tests/e2e',
  // The editor pages lazily import react-quill-new; give the dev server room
  // to compile on first hit.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: enabled ? 'line' : [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    launchOptions: {
      // Prefer the user's installed Chrome; Playwright's bundled Chromium
      // works too via PLAYWRIGHT_BROWSER_CHANNEL=chromium.
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome',
    },
  },
  projects: [
    {
      name: 'auth',
      testMatch: /auth\.setup\.ts/,
    },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
    { name: 'laptop', use: { viewport: { width: 1366, height: 768 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
    { name: 'tablet', use: { viewport: { width: 1024, height: 768 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
    { name: 'mobile', use: { ...devices['Pixel 7'], storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
  ],
});
