import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Signs in once per run; every project below reuses the session cookie, so
 * the login rate limiter sees a single attempt instead of one per test.
 */
const emails = process.env.TEST_EDITOR_EMAIL;
const password = process.env.TEST_EDITOR_PASSWORD;

const authFile = resolve(process.cwd(), 'tests/e2e/.auth/user.json');

setup.skip(!(process.env.EDITOR_E2E === '1' && emails && password), 'editor e2e disabled');

setup('sign in as a fixture admin/editor', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', emails!);
  await page.fill('input[name="password"]', password!);
  await page.getByRole('button', { name: 'Sign In to Continue' }).click();
  // Successful auth redirects off /login (dashboard or callback landing).
  await expect(page).toHaveURL(/(dashboard|\/admin)/, { timeout: 60_000 });
  mkdirSync(resolve(process.cwd(), 'tests/e2e/.auth'), { recursive: true });
  await page.context().storageState({ path: authFile });
});
