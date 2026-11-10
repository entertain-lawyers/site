import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Pre-Merge Verification Suite: Complete Matrix', () => {
  const TEST_LAWYER_NAME = 'Advocate PreMerge Test';
  const TEST_LAWYER_SLUG = `pre-merge-lawyer-${Date.now()}`;
  let lawyerId = '';

  test.beforeAll(async () => {
    // Seed a test consultation lawyer
    const lawyer = await prisma.consultationLawyer.create({
      data: {
        name: TEST_LAWYER_NAME,
        slug: TEST_LAWYER_SLUG,
        title: 'Senior Advocate',
        licenseNumber: 'TEST-LIC-999',
        specialization: 'Corporate and Cyber Law',
        practiceAreas: 'Corporate Law, Intellectual Property',
        serviceCities: 'Kathmandu, Lalitpur',
        phone: '+977 9800009999',
        isAvailable: true,
        displayOrder: 1,
      },
      select: { id: true },
    });
    lawyerId = lawyer.id;
  });

  test.afterAll(async () => {
    // Clean up test consultations, lawyers, and test acts
    await prisma.consultationRequest.deleteMany({
      where: { fullName: { contains: 'PreMerge Client' } },
    });
    if (lawyerId) {
      await prisma.consultationLawyer.deleteMany({
        where: { id: lawyerId },
      });
    }
    await prisma.actLaw.deleteMany({
      where: { title: { contains: 'E2E Test Act' } },
    });
    await prisma.$disconnect();
  });

  test('English and Nepali post pages: render content, headings, and author attribution', async ({ page }) => {
    // 1. English blogs
    await page.goto('/blogs');
    await expect(page.getByRole('heading', { name: /Latest Blogs & Articles/i })).toBeVisible();
    const enPostLink = page.locator('article h3 a, h3 a').first();
    await expect(enPostLink).toBeVisible();

    // 2. Nepali posts
    await page.goto('/nepali');
    await expect(page.getByText(/ताजा/i).first()).toBeVisible();
    const nePostLink = page.locator('a[href^="/nepali/post/"]').first();
    if (await nePostLink.isVisible()) {
      await nePostLink.click();
      await expect(page).toHaveURL(/\/nepali\/post\//);
      // Verify Nepali author trigger or logo
      const authorElem = page.locator('button[aria-haspopup="dialog"]').first();
      await expect(authorElem).toBeVisible();
    }
  });

  test('Acts & Laws Public: renders repository, category filtering, search, and document modal', async ({ page }) => {
    await page.goto('/acts-and-laws');

    // 1. Verify header and badge
    await expect(page.getByText('Nepal Legal Repository')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acts and Laws', exact: true })).toBeVisible();

    // 2. Verify search functionality
    const searchInput = page.getByPlaceholder(/Search acts/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Constitution');
    await expect(page.getByText('Constitution of Nepal (नेपालको संविधान)')).toBeVisible();

    // 3. Clear search and test category filtering
    await searchInput.fill('');
    const rulesFilterBtn = page.getByRole('button', { name: 'Rules / Regulations', exact: true });
    if (await rulesFilterBtn.isVisible()) {
      await rulesFilterBtn.click();
      await expect(page.locator('h2:has-text("Rules")').first()).toBeVisible();
    }

    // 4. Test View Document action
    const allFilterBtn = page.getByRole('button', { name: 'All', exact: true });
    await allFilterBtn.click();
    await searchInput.fill('Arbitration Act');
    const viewButton = page.getByRole('button', { name: 'View', exact: true }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Verify modal opened
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Arbitration Act, 2055')).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: 'Close reader' });
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Consult a Lawyer: directory → profile → booking → persistence verification', async ({ page }) => {
    // 1. Directory page
    await page.goto('/consultation');
    await expect(page.getByRole('heading', { name: 'Consult a Lawyer', exact: true })).toBeVisible();

    // Find our test lawyer card and its View More / Consult action
    const lawyerCard = page.locator(`article:has-text("${TEST_LAWYER_NAME}")`);
    await expect(lawyerCard).toBeVisible();

    const viewProfileBtn = lawyerCard.getByRole('button', { name: 'View More / Consult' });
    await expect(viewProfileBtn).toBeVisible();
    await viewProfileBtn.click();

    // 2. Profile page
    await expect(page).toHaveURL(`/consultation/${TEST_LAWYER_SLUG}`);
    await expect(page.getByRole('heading', { name: TEST_LAWYER_NAME })).toBeVisible();

    // Click Book a Consultation
    const bookBtn = page.getByRole('link', { name: /Book a Consultation/i });
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // 3. Booking page
    await expect(page).toHaveURL(`/consultation/${TEST_LAWYER_SLUG}/book`);
    await expect(page.getByRole('heading', { name: `Advocate ${TEST_LAWYER_NAME}` })).toBeVisible();

    // Verify advocate is preselected in the form
    await expect(page.getByText(/Selected advocate:/i)).toBeVisible();

    // 4. Fill valid consultation form
    const form = page.locator('form');
    await form.getByPlaceholder('Your full name').fill('PreMerge Client Test');
    await form.getByPlaceholder('+977 98XXXXXXXX').first().fill('+977 9801122334');
    await form.getByPlaceholder('+977 98XXXXXXXX').nth(1).fill('+977 9801122334');
    await form.getByPlaceholder('District, city or municipality').fill('Biratnagar, Morang');
    await form.getByPlaceholder('Where you currently stay').fill('Baneshwor, Kathmandu');
    await form.getByPlaceholder('you@example.com').fill('premerge.client@example.com');
    await form.getByPlaceholder(/write your legal problem here/i).fill('Detailed consultation inquiry regarding commercial contract arbitration.');

    // Submit form
    const submitBtn = form.getByRole('button', { name: /^Submit$/i });
    await submitBtn.click();

    // Verify success banner / confirmation
    await expect(page.getByRole('status').filter({ hasText: 'Request received' })).toBeVisible({ timeout: 20_000 });

    // Verify persistence in DB
    const saved = await prisma.consultationRequest.findFirst({
      where: { fullName: 'PreMerge Client Test' },
    });
    expect(saved).not.toBeNull();
    expect(saved?.email).toBe('premerge.client@example.com');
    expect(saved?.lawyerId).toBe(lawyerId);
    expect(saved?.description).toContain('[Requested Advocate: Advocate PreMerge Test]');
  });

  test('Author Attribution: renders avatar, initials/fallback, and bio modal on listing and detail', async ({ page }) => {
    // Navigate to blogs list
    await page.goto('/blogs');
    await expect(page.getByRole('heading', { name: /Latest Blogs & Articles/i })).toBeVisible();

    // Author bio trigger button on listing
    const authorTrigger = page.locator('button[aria-haspopup="dialog"]').first();
    await expect(authorTrigger).toBeVisible();

    // Click author trigger to open bio modal
    await authorTrigger.click();

    // Bio modal dialog should be displayed
    const bioDialog = page.locator('div[role="dialog"]');
    await expect(bioDialog).toBeVisible();
    await expect(bioDialog.getByText(/Short Bio/i)).toBeVisible();

    // Close bio modal
    const closeBtn = bioDialog.locator('button[aria-label="Close"]');
    await closeBtn.click();
    await expect(bioDialog).not.toBeVisible();
  });

  test('Admin Acts CRUD: creates and views an act in admin panel', async ({ page }) => {
    // Already authenticated via auth.setup storageState
    await page.goto('/admin/acts');
    await expect(page.getByRole('heading', { name: /Acts & Laws/i })).toBeVisible();

    // Add new act
    await page.getByRole('link', { name: 'Add Act / Law' }).click();
    await expect(page).toHaveURL('/admin/acts/new');

    const actTitle = `E2E Test Act ${Date.now()}`;
    await page.locator('#act-title').fill(actTitle);
    await page.locator('#act-category').selectOption('ACTS');
    await page.locator('#act-desc').fill('Pre-merge automated test act description.');
    await page.getByRole('button', { name: 'Save Act / Law' }).click();

    // Verify redirected to /admin/acts and act is present
    await page.waitForURL('/admin/acts', { timeout: 20_000 });
    await expect(page.getByText(actTitle)).toBeVisible();

    // Clean up via database
    await prisma.actLaw.deleteMany({
      where: { title: actTitle },
    });
  });

  test('Admin Resource Editor: verifies writing workspace and mode switching', async ({ page }) => {
    // Navigate to resource editor create page
    await page.goto('/admin/study/resources/new');
    await expect(page.getByRole('heading', { name: 'New Resource', exact: true })).toBeVisible();

    // Verify Sticky Action Bar buttons
    await expect(page.getByRole('button', { name: /Save as Draft/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Publish/i }).first()).toBeVisible();

    // Verify Mode Switch buttons
    const uploadPdfBtn = page.getByRole('button', { name: 'Upload PDF', exact: true });
    const writeNoteBtn = page.getByRole('button', { name: 'Write Note', exact: true });
    await expect(uploadPdfBtn).toBeVisible();
    await expect(writeNoteBtn).toBeVisible();

    // Click Upload PDF
    await uploadPdfBtn.click();
    await expect(page.getByText(/Attach a study document as a downloadable PDF file/i)).toBeVisible();

    // Click Write Note
    await writeNoteBtn.click();
    await expect(page.locator('.resource-note-canvas')).toBeVisible();
  });
});
