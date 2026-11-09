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

if (enabled) {
  const rawBaseUrl = process.env.BASE_URL || 'http://localhost:3000';
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(rawBaseUrl);
  } catch {
    throw new Error(`SAFETY HALT: BASE_URL (${rawBaseUrl}) is not a valid URL.`);
  }
  const hostname = parsedBaseUrl.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.test') || hostname.endsWith('.local');
  if (!isLocalHost) {
    throw new Error(`SAFETY HALT: EDITOR_E2E=1 requires a local or approved disposable BASE_URL host (localhost, 127.0.0.1). Received hostname: "${hostname}". Refusing to run against production.`);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl || dbUrl.includes('prod') || dbUrl.includes('production') || (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1') && !dbUrl.includes('test') && !dbUrl.includes('dev') && !dbUrl.includes('sqlite'))) {
    throw new Error(`SAFETY HALT: DATABASE_URL is missing or appears to target a non-disposable/production database. Refusing to run E2E tests.`);
  }

  const wpEnUrl = process.env.WP_ENGLISH_URL || 'https://entertainlawyers.com/wp-json/wp/v2';
  const wpNeUrl = process.env.WP_NEPALI_URL || 'https://entertainlawyers.com/nepali/wp-json/wp/v2';

  for (const [name, wpUrl] of Object.entries({ WP_ENGLISH_URL: wpEnUrl, WP_NEPALI_URL: wpNeUrl })) {
    let parsedWp: URL;
    try {
      parsedWp = new URL(wpUrl);
    } catch {
      throw new Error(`SAFETY HALT: ${name} (${wpUrl}) is not a valid URL.`);
    }
    const wpHospitality = parsedWp.hostname;
    if (wpHospitality.includes('entertainlawyers.com') || wpHospitality.includes('production') || wpHospitality.includes('live')) {
      throw new Error(`SAFETY HALT: ${name} points to production WordPress (${wpHospitality}). Refusing to run E2E tests against production WordPress.`);
    }
    const isWpLocal = wpHospitality === 'localhost' || wpHospitality === '127.0.0.1' || wpHospitality.includes('localwp') || wpHospitality.includes('test');
    if (!isWpLocal) {
      throw new Error(`SAFETY HALT: ${name} (${wpHospitality}) must be a local mock or disposable test endpoint.`);
    }
  }

  const authHeader = process.env.WP_AUTH_HEADER || '';
  const authUser = process.env.WP_AUTH_USERNAME || '';
  if (authHeader.includes('prod') || authUser.includes('prod')) {
    throw new Error(`SAFETY HALT: Production WordPress credentials detected in test environment variables.`);
  }

  // E2E_MOCK_WP_URL powers DESTRUCTIVE cleanup requests (DELETE /posts/{id}) in
  // the suite. It is mandatory, must be an explicitly local host, and must
  // point at the same mock WordPress instance the app is configured against
  // (same origin as WP_ENGLISH_URL / WP_NEPALI_URL) so cleanup can never hit
  // the production WordPress site.
  const rawMockWpUrl = process.env.E2E_MOCK_WP_URL;
  if (!rawMockWpUrl) {
    throw new Error(`SAFETY HALT: EDITOR_E2E=1 requires E2E_MOCK_WP_URL (the disposable local mock WordPress base, e.g. http://127.0.0.1:8788/wp-json/wp/v2). Post cleanup must never be attempted against an unconfigured target.`);
  }
  let parsedMockWp: URL;
  try {
    parsedMockWp = new URL(rawMockWpUrl);
  } catch {
    throw new Error(`SAFETY HALT: E2E_MOCK_WP_URL (${rawMockWpUrl}) is not a valid URL.`);
  }
  if (parsedMockWp.protocol !== 'http:' && parsedMockWp.protocol !== 'https:') {
    throw new Error(`SAFETY HALT: E2E_MOCK_WP_URL (${rawMockWpUrl}) must use http(s).`);
  }
  const mockWpHostname = parsedMockWp.hostname;
  const productionMarkers = ['entertainlawyers.com', 'production', 'staging', 'stage', 'live'];
  if (productionMarkers.some((marker) => mockWpHostname.includes(marker))) {
    throw new Error(`SAFETY HALT: E2E_MOCK_WP_URL (${mockWpHostname}) looks like a production or staging WordPress host. Destructive cleanup must never target it.`);
  }
  const isMockWpHostApproved = mockWpHostname === 'localhost' || mockWpHostname === '127.0.0.1' || mockWpHostname === '0.0.0.0' || mockWpHostname.endsWith('.test') || mockWpHostname.endsWith('.local');
  if (!isMockWpHostApproved) {
    throw new Error(`SAFETY HALT: E2E_MOCK_WP_URL (${mockWpHostname}) is not an explicitly approved local host (localhost, 127.0.0.1, 0.0.0.0, *.test, *.local). Refusing destructive cleanup against an arbitrary remote host.`);
  }
  // The cleanup target must be the same local mock instance the app reads/writes.
  const configuredMockWpOrigins = [wpEnUrl, wpNeUrl].map((u) => new URL(u).origin);
  if (!configuredMockWpOrigins.includes(parsedMockWp.origin)) {
    throw new Error(`SAFETY HALT: E2E_MOCK_WP_URL origin (${parsedMockWp.origin}) does not match the configured mock WordPress instance (${configuredMockWpOrigins.join(' / ')}). Cleanup must target the same disposable mock WP the app is configured against.`);
  }
}

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
    {
      name: 'desktop', use: { viewport: { width: 1440, height: 900 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'],
    },
    { name: 'laptop', use: { viewport: { width: 1366, height: 768 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
    { name: 'small-laptop', use: { viewport: { width: 1280, height: 720 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
    { name: 'tablet', use: { viewport: { width: 1024, height: 768 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['auth'] },
  ],
});
