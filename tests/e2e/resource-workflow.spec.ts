import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Resource workflow E2E: draft → preview → publish → public visibility, plus
 * PDF resource creation against the disposable mock storage bucket and the
 * admin resource-list search/filter surface.
 *
 * Safety: skips unless EDITOR_E2E=1. The dev database is disposable (enforced
 * by playwright.config.ts) and every created resource is deleted (verified) in
 * afterEach.
 */

const PASSED_ENV = process.env.EDITOR_E2E === '1';
test.skip(!PASSED_ENV, 'Resource workflow E2E requires EDITOR_E2E=1 (disposable local environment).');

let createdResourceIds: string[] = [];

/** Select the first real (non-empty) option across dependent semester/subject selects. */
async function selectFirstSemesterAndSubject(page: Page) {
  const semesterValue = await page
    .locator('#resource-semester option:not([value=""])')
    .first()
    .getAttribute('value')
    .catch(() => null);
  test.skip(!semesterValue, 'dev database has no semester fixture; seed Semester/Subject rows first.');
  await page.selectOption('#resource-semester', semesterValue!);

  const subjectValue = await page
    .locator('#resource-subject option:not([value=""])')
    .first()
    .getAttribute('value')
    .catch(() => null);
  test.skip(!subjectValue, 'dev database has no subject fixture; seed a Subject row first.');
  await page.selectOption('#resource-subject', subjectValue!);
}

async function openNoteEditor(page: Page, uniqueTitle: string) {
  await page.goto('/admin/study/resources/new', { waitUntil: 'load' });
  await page.getByRole('button', { name: /Write Note/i }).click();
  await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
  await page.fill('#resource-title', uniqueTitle);
  await selectFirstSemesterAndSubject(page);
  // A short unique document so state round-trips are observable.
  await page.locator('.editor-wrapper .ql-editor').click();
  await page.keyboard.type(`First paragraph of ${uniqueTitle}.\n\nRetention marker: ${uniqueTitle}-END`);
  await page.waitForTimeout(300);
}

test.afterEach(async () => {
  if (!createdResourceIds.length) return;
  let client: import('@prisma/client').PrismaClient | null = null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    client = new PrismaClient();
    const result = await client.resource.deleteMany({ where: { id: { in: createdResourceIds } } });
    if (result.count === createdResourceIds.length) {
      console.log(`[cleanup] confirmed deletion of ${result.count}/${createdResourceIds.length} resources from dev DB (${createdResourceIds.join(', ')})`);
    } else {
      throw new Error(`Resource cleanup verification failed: deleteMany removed ${result.count} rows but ${createdResourceIds.length} were tracked (${createdResourceIds.join(', ')})`);
    }
  } finally {
    await client?.$disconnect().catch(() => {});
  }
  createdResourceIds = [];
});

test.describe('Resource editor workflow', () => {
  test('draft stays private, preview mirrors the editor, publishing makes it public', async ({ page }) => {
    test.setTimeout(240_000);
    const unique = `E2E Workflow Resource ${Date.now() % 100000}`;
    await openNoteEditor(page, unique);

    // Save as Draft (use the header action bar button to avoid strict mode violation with sidebar duplicate).
    const draftButton = page.locator('.resource-action-buttons button[name="status"][value="DRAFT"]').first();
    await draftButton.click();
    await expect(page.getByText(/saved as draft/i)).toBeVisible();
    const idFromUrl = new URL(page.url()).pathname.match(/\/admin\/study\/resources\/([a-f0-9-]{36})\/edit/)?.[1];
    expect(idFromUrl, 'save preserves the created resource ID in the edit URL').toBeTruthy();
    createdResourceIds.push(idFromUrl!);

    // Draft is not publicly accessible (server-side guard returns 404).
    const draftResponse = await page.goto(`/resources/${idFromUrl}`);
    expect(draftResponse?.status(), 'drafts must not be publicly reachable').toBe(404);

    // The draft shows up in the Drafts tab and via server-side search.
    await page.goto('/admin/study/resources?status=draft');
    await expect(page.locator('tbody tr').filter({ hasText: unique })).toBeVisible();
    // Prisma `contains` is substring matching, so search for the full title
    // (tokens are not split in the database).
    await page.goto(`/admin/study/resources?q=${encodeURIComponent(unique)}`);
    await expect(page.locator('tbody tr').filter({ hasText: unique })).toBeVisible();

    // Unsaved-changes protection: edit something, the header chip flips, and
    // leaving via "Back to Resources" is confirmed by a dialog.
    // Return to this resource's edit page (the search step navigated away).
    await page.goto(`/admin/study/resources/${idFromUrl}/edit`, { waitUntil: 'load' });
    await page.fill('#resource-title', `${unique} Edited`);
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    const confirmPromise = page.waitForEvent('dialog', { timeout: 20_000 });
    // Don't await the click before dismissing the dialog: the un-dismissed
    // confirm() blocks the click action itself.
    const clickPromise = page
      .getByRole('link', { name: /Back to Resources/ })
      .click()
      .catch(() => {});
    const dialog = await confirmPromise;
    expect(dialog.message()).toContain('unsaved changes');
    await dialog.dismiss();
    await clickPromise;
    await expect(page).toHaveURL(/\/admin\/study\/resources\/[a-f0-9-]{36}\/edit/);

    // Preview opens the shared /preview route with the current editor content.
    const previewPromise = page.waitForEvent('popup', { timeout: 30_000 });
    await page.getByRole('button', { name: /Preview/ }).click();
    const preview = await previewPromise;
    await preview.waitForLoadState('load');
    await expect(preview.getByText(`${unique} Edited`)).toBeVisible();
    await expect(preview.getByText(`Retention marker: ${unique}-END`)).toBeVisible();
    // "Back to Editor" returns to this resource's edit page.
    await expect(preview.getByRole('link', { name: /Back to Editor/i })).toHaveAttribute('href', /\/admin\/study\/resources\/[a-f0-9-]{36}\/edit/);
    await preview.close();

    // Publishing needs a save: the chip returns to "All changes saved" only
    // after Save & Publish; the new title must be persisted first.
    // Use the header action bar button to avoid strict mode violation with sidebar duplicate.
    await page.locator('.resource-action-buttons button[name="status"][value="PUBLISHED"]').first().click();
    await expect(page.getByText(/published successfully/i)).toBeVisible();
    const published = await page.goto(`/resources/${idFromUrl}`);
    expect(published?.status(), 'published resource is publicly viewable').toBe(200);
    await expect(page.getByText(`${unique} Edited`)).toBeVisible();
  });

  test('PDF resources keep working: upload through mock storage and read back', async ({ page }) => {
    test.setTimeout(240_000);
    // Minimal but structurally valid PDF.
    const pdfPath = path.join(os.tmpdir(), `e2e-resource-${Date.now()}.pdf`);
    fs.writeFileSync(
      pdfPath,
      Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF\n'),
      'utf8'
    );
    const unique = `E2E PDF Resource ${Date.now() % 100000}`;

    await page.goto('/admin/study/resources/new', { waitUntil: 'load' });
    // PDF is the default mode on a new resource.
    await expect(page.locator('form')).toHaveAttribute('data-resource-scroll-mode', 'fill-height');
    await page.fill('#resource-title', unique);
    await selectFirstSemesterAndSubject(page);
    await page.setInputFiles('#file-upload', pdfPath);
    await expect(page.getByText(new RegExp(path.basename(pdfPath)))).toBeVisible();

    // The header exposes the same workflow actions in PDF mode.
    await page.locator('.resource-action-buttons button[name="status"][value="DRAFT"]').first().click();
    await expect(page.getByText(/saved as draft/i)).toBeVisible({ timeout: 120_000 });
    const idFromUrl = new URL(page.url()).pathname.match(/\/admin\/study\/resources\/([a-f0-9-]{36})\/edit/)?.[1];
    expect(idFromUrl).toBeTruthy();
    createdResourceIds.push(idFromUrl!);
    // Editing an existing PDF keeps its document attached.
    await expect(page.getByText(/PDF document stays attached/i)).toBeVisible();

    // Publish and read the document back through mock storage.
    await page.locator('.resource-action-buttons button[name="status"][value="PUBLISHED"]').first().click();
    await expect(page.getByText(/published successfully/i)).toBeVisible({ timeout: 120_000 });

    await page.goto(`/resources/${idFromUrl}`);
    await expect(page.getByText(unique)).toBeVisible();
    await page.getByRole('link', { name: /Read Document/i }).first().click();

    // The secure viewer fetches the presigned mock-storage URL through pdf.js;
    // intercept that request and verify the stored PDF is actually served.
    const pdfResponse = await page.waitForResponse(
      (res) => res.url().includes(':9000') && res.url().includes('documents/'),
      { timeout: 60_000 }
    );
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('pdf');
    fs.rmSync(pdfPath, { force: true });
  });
});
