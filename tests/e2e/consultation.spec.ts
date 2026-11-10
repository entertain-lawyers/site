import { test, expect, type Page } from '@playwright/test';

/**
 * Consult a Lawyer discovery + booking + admin management E2E.
 *
 * Drives the real public /consultation page (Team-page style cards, inline
 * expanded profile, booking form), a real server-action submission into the
 * disposable dev database, and the admin request manager.
 *
 * Safety: skips unless EDITOR_E2E=1 and DATABASE_URL points at the disposable
 * local development database (enforced by playwright.config.ts). Seeded lawyer
 * rows and submitted requests are deleted and verified in afterAll.
 */

const PASSED_ENV = process.env.EDITOR_E2E === '1';
test.skip(!PASSED_ENV, 'Consultation E2E requires EDITOR_E2E=1 (disposable local environment).');

const LAWYER_NAME = 'E2E Consult Advocate';
const CLIENT_NAME = 'E2E Consult Client';
const NEPALI_MARKER = 'मेरो घर जग्गा विवाद छ';
const MIXED_MARKER = 'ARN-E2E-PARTITION-2244';

let client: import('@prisma/client').PrismaClient | null = null;
let seededLawyerId = '';
let seededLawyerSlug = '';
let submittedRequestId = '';

test.beforeAll(async () => {
  const { PrismaClient } = await import('@prisma/client');
  client = new PrismaClient();
  // Idempotent seeding: clear the lawyer marker and any submission marker left
  // behind by an interrupted earlier run. We delete by marker prefix only.
  await client.consultationRequest.deleteMany({ where: { fullName: { startsWith: CLIENT_NAME } } });
  await client.consultationLawyer.deleteMany({ where: { name: { startsWith: LAWYER_NAME } } });
  // Generate a valid UUID for the lawyer ID
  const lawyerId = crypto.randomUUID();
  seededLawyerSlug = `e2e-consult-advocate-${Date.now()}`;
  const lawyer = await client.consultationLawyer.create({
    data: {
      id: lawyerId,
      name: LAWYER_NAME,
      slug: seededLawyerSlug,
      title: 'Senior Advocate',
      licenseNumber: 'E2E-LIC-007',
      specialization: 'Constitutional and family law',
      practiceAreas: 'Constitutional law, Family dispute',
      serviceCities: 'Lalitpur',
      lawFirm: 'E2E Chambers LLP',
      qualifications: 'B.A. LL.B. (Hons)',
      achievements: 'E2E Moot Court champion',
      experience: '10 years of practice',
      officeAddress: 'Pulchowk, Lalitpur',
      phone: '+977 9800000001',
      isAvailable: true,
      isFeatured: false,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true },
  });
  seededLawyerId = lawyer.id;
});

test.afterAll(async () => {
  if (!client) return;
  try {
    // Requests: delete the marker-scoped rows and verify.
    const requests = await client.consultationRequest.deleteMany({ where: { fullName: { startsWith: CLIENT_NAME } } });
    if (requests.count === 0 && submittedRequestId) {
      throw new Error(`consultation request cleanup removed 0 rows, expected at least 1 (tracked ${submittedRequestId})`);
    }
    console.log(`[cleanup] confirmed deletion of ${requests.count} consultation request(s) from dev DB`);
    const lawyers = await client.consultationLawyer.deleteMany({ where: { name: { startsWith: LAWYER_NAME } } });
    if (lawyers.count === 0 && seededLawyerId) {
      throw new Error(`lawyer profile cleanup removed 0 rows, expected 1 (tracked ${seededLawyerId})`);
    }
    console.log(`[cleanup] confirmed deletion of ${lawyers.count} lawyer profile(s) from dev DB`);
  } finally {
    await client.$disconnect().catch(() => {});
  }
});

/** Locate the seeded directory card (the page may list other dev-DB lawyers too). */
function seededCard(page: Page) {
  return page.locator('article').filter({ hasText: LAWYER_NAME }).first();
}

function bookingForm(page: Page) {
  return page.locator('form');
}

test.describe('Consult a Lawyer discovery', () => {
  test('directory cards render 4/5 portraits with exactly one primary action and essential info only', async ({ page }) => {
    await page.goto('/consultation', { waitUntil: 'load' });
    await page.waitForSelector('article');
    const card = seededCard(page);
    await expect(card).toBeVisible();
    // Full portrait in the Team-page mat (4/5 aspect and hairline ring).
    await expect(card.locator('[class*="aspect-[4/5]"]')).toHaveCount(1);
    await expect(card).toContainText(LAWYER_NAME);
    await expect(card).toContainText('Senior Advocate');
    await expect(card).toContainText('Lalitpur'); // service location
    // Specialization, biography or contact channels kept off the card.
    await expect(card).not.toContainText('Constitutional and family law');
    await expect(card).not.toContainText('+977 9800000001');
    await expect(card).not.toContainText('Pulchowk, Lalitpur');
    // ONE primary action: "View More / Consult" navigating to dedicated profile page.
    const action = card.getByRole('button', { name: /View More \/ Consult/i });
    await expect(action).toHaveCount(1);
    await expect(action).toContainText('View More / Consult');
    await expect(action).toHaveAttribute('href', `/consultation/${seededLawyerSlug}`);
  });

  test('clicking View More / Consult navigates to the dedicated lawyer profile page in a new page', async ({ page }) => {
    await page.goto('/consultation', { waitUntil: 'load' });
    await page.waitForSelector('article');
    const card = seededCard(page);
    await card.getByRole('button', { name: /View More \/ Consult/i }).click();

    await expect(page).toHaveURL(`/consultation/${seededLawyerSlug}`);
    const panel = page.locator('#consult-lawyer-profile');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(LAWYER_NAME);
    // Identity block.
    await expect(panel).toContainText('Senior Advocate · E2E-LIC-007');
    await expect(panel).toContainText('E2E Chambers LLP');
    // Profile details.
    await expect(panel.getByRole('heading', { name: LAWYER_NAME })).toBeVisible();
    await expect(panel).toContainText('B.A. LL.B. (Hons)');
    await expect(panel).toContainText('E2E Moot Court champion');
    await expect(panel).toContainText('Pulchowk, Lalitpur');
    // Direct-call contact links (one in Contacts card, one in Direct Call CTA button).
    await expect(panel.locator('a[href="tel:+9779800000001"]')).toHaveCount(2);
    // WhatsApp channel correctly derives from the seeded phone number.
    await expect(panel.locator('a[href*="wa.me/9779800000001"]')).toHaveCount(1);
    // Prominent booking CTA inside the profile linking to the dedicated booking page.
    const bookCta = panel.getByRole('link', { name: /Book a Consultation/ });
    await expect(bookCta).toHaveCount(1);
    await expect(bookCta).toHaveAttribute('href', `/consultation/${seededLawyerSlug}/book`);
  });

  test('Book a Consultation in the profile opens the dedicated booking page with the lawyer preselected', async ({ page }) => {
    await page.goto(`/consultation/${seededLawyerSlug}`, { waitUntil: 'load' });
    const panel = page.locator('#consult-lawyer-profile');
    await panel.getByRole('link', { name: /Book a Consultation/ }).click();

    await expect(page).toHaveURL(`/consultation/${seededLawyerSlug}/book`);
    const form = bookingForm(page);
    await expect(form).toBeVisible();
    await expect(page.getByRole('heading', { name: `Advocate ${LAWYER_NAME}` })).toBeVisible();
    await expect(form).toContainText('Selected advocate:');
  });

  test('required field validation blocks an empty submission', async ({ page }) => {
    await page.goto(`/consultation/${seededLawyerSlug}/book`, { waitUntil: 'load' });

    const form = bookingForm(page);
    await expect(form).toBeVisible();
    const valid = await form.evaluate((el: HTMLFormElement) => el.checkValidity());
    expect(valid).toBe(false);

    const beforeCount = await (client as import('@prisma/client').PrismaClient).consultationRequest.count({
      where: { fullName: { startsWith: CLIENT_NAME } },
    });
    await form.getByRole('button', { name: /Submit/i }).click();
    await page.waitForTimeout(1500);
    const afterCount = await (client as import('@prisma/client').PrismaClient).consultationRequest.count({
      where: { fullName: { startsWith: CLIENT_NAME } },
    });
    expect(afterCount).toBe(beforeCount);
  });
});

test.describe('Consult a Lawyer booking', () => {
  test('a Nepali/mixed-language submission creates a real request bound to the selected lawyer', async ({ page }) => {
    await page.goto(`/consultation/${seededLawyerSlug}/book`, { waitUntil: 'load' });

    const form = bookingForm(page);
    await expect(form).toBeVisible();
    const fullName = `${CLIENT_NAME} Sub`;
    const nameInput = form.getByPlaceholder('Your full name');
    await expect(nameInput).toBeVisible();
    await page.waitForLoadState('networkidle');
    await nameInput.click();
    await nameInput.fill(fullName);
    if ((await nameInput.inputValue()) !== fullName) {
      await nameInput.fill(fullName);
    }
    await expect(nameInput).toHaveValue(fullName);
    await form.getByPlaceholder('+977 98XXXXXXXX').first().fill('+977 9800000002');
    await form.getByPlaceholder('+977 98XXXXXXXX').nth(1).fill('+977 9800000002');
    await form.getByPlaceholder('District, city or municipality').fill('Lalitpur ward 4, Nepal');
    await form.getByPlaceholder('Where you currently stay').fill('Kathmandu hostel, Nepal');
    await form.getByPlaceholder(/write your legal problem here/i).fill(`${NEPALI_MARKER}. Please help with the family partition matter ${MIXED_MARKER}.`);

    const submit = form.getByRole('button', { name: /Submit/i });
    await submit.click();
    // Wait for submitting state to finish
    await expect(form.getByRole('button', { name: /Submitting/i })).toBeHidden({ timeout: 30000 });
    const confirmation = page.getByRole('status').filter({ hasText: 'Request received' });
    await expect(confirmation).toBeVisible({ timeout: 30000 });
    // Honest copy: received for review — no false claim of a confirmed appointment.
    await expect(page.getByText('will review your request')).toBeVisible();
    const reference = await page.getByText(/^Reference: /).textContent();
    expect(reference).toBeTruthy();

    // The request persisted with Unicode text and the requested advocate's id.
    const request = await (client as import('@prisma/client').PrismaClient).consultationRequest.findFirst({
      where: { fullName },
      select: { id: true, description: true, lawyerId: true },
    });
    expect(request).toBeTruthy();
    submittedRequestId = request!.id;
    expect(request!.lawyerId).toBe(seededLawyerId);
    expect(request!.description).toContain(NEPALI_MARKER);
    expect(request!.description).toContain(MIXED_MARKER);

    // Duplicate submissions are prevented after success: the form is replaced
    // by the confirmation (no double-submit possible) with an explicit reset.
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Submit another request');
  });

  test('administrators can review the request, read the description, and update its status', async ({ page }) => {
    if (!submittedRequestId) test.skip(true, 'no submitted request from the previous test');
    await page.goto('/admin/consultations', { waitUntil: 'load' });
    const row = page.locator('tr').filter({ hasText: `${CLIENT_NAME} Sub` }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(`Requested: ${LAWYER_NAME}`);
    await expect(row).toContainText('PHYSICAL');
    await row.click();

    const dialog = page.getByRole('dialog', { name: `Consultation request from ${`${CLIENT_NAME} Sub`}` });
    await expect(dialog).toBeVisible();
    // Contact information, mode, and the complete legal problem description.
    await expect(dialog).toContainText('+977 9800000002');
    await expect(dialog).toContainText('Consultation Mode:');
    await expect(dialog).toContainText('Case Description:');
    await expect(dialog).toContainText(NEPALI_MARKER);
    await expect(dialog).toContainText(MIXED_MARKER);

    // Status update through the existing supported statuses.
    await dialog.locator('select').first().selectOption('CONTACTED');
    await expect(dialog.getByText('Status updated successfully')).toBeVisible();

    // Internal confidential notes.
    await dialog.locator('textarea').fill('E2E internal note — call back Sunday');
    await dialog.getByRole('button', { name: /Save Notes/i }).click();
    await expect(dialog.getByText('Notes saved successfully')).toBeVisible();

    const updated = await (client as import('@prisma/client').PrismaClient).consultationRequest.findUnique({
      where: { id: submittedRequestId },
      select: { status: true, adminNotes: true },
    });
    expect(updated?.status).toBe('CONTACTED');
    expect(updated?.adminNotes).toContain('call back Sunday');
  });
});
