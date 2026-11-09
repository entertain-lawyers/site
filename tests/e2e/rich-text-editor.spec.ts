import { test, expect, type Page } from '@playwright/test';

/**
 * Regression tests for the admin Rich Text Editor workspace.
 *
 * Root cause of the original bug: on the post/resource editors the canvas
 * grew with its content (tens of thousands of pixels tall), so the PAGE
 * scrolled instead of `.ql-editor`, and the toolbar + font selector
 * disappeared while writing long documents.
 *
 * Contract under test (viewport-width >= 1024):
 *   1. `.ql-editor` overflows (scrollHeight > clientHeight) and scrolls
 *      internally; the page itself does not scroll while the canvas does.
 *   2. The Quill toolbar and the custom font selector row stay visible while
 *      the internal scroll moves.
 *   3. Typing at the end of a 20k+ word document keeps the caret visible.
 *   4. Saved drafts round-trip without truncation.
 * Below 1024px the page may scroll by design; the tests then only assert no
 * horizontal overflow, a usable caret, and preserved content.
 *
 * Environment: safety checks enforced at runtime via playwright.config.ts when EDITOR_E2E=1.
 */

const PASSED_ENV = process.env.EDITOR_E2E === '1';

test.skip(
  !PASSED_ENV,
  'Editor E2E requires EDITOR_E2E=1 (and a disposable local environment with a test account).'
);

const CANARY = 'END-OF-FIXTURE-EDIT-CANARY';
const NEPALI_CANARY = 'नेपाल-कानून-अन्तिम-मार्कर-९९८८७७';

// State to track test data for cleanup
let createdPostIds: number[] = [];
let createdResourceIds: string[] = [];

/**
 * Real cleanup, confined to the disposable environment:
 *  - posts only ever live in the mock WordPress instance (deleted via its REST API)
 *  - NOTE resources live in the dev database (deleted via Prisma; the config's
 *    safety halt already guarantees DATABASE_URL points at a disposable DB)
 *
 * Cleanup is VERIFIED, not best-effort: every deletion response is inspected,
 * and any failure fails the test explicitly (a warning would vanish in the
 * output while test data keeps piling up in the disposable environment).
 */
interface CleanupOutcome {
  postId: number;
  status: 'DELETED' | 'ALREADY_DELETED' | 'FAILED';
  detail: string;
}

test.afterEach(async ({ page }) => {
  // --- Posts: DELETE against the validated local mock WP only ---
  if (createdPostIds.length) {
    const mockWpUrl = process.env.E2E_MOCK_WP_URL!;
    // The mock accepts ANY Basic credentials (it is a disposable local mock);
    // the header is required so the request is not rejected as unauthenticated.
    const cleanupAuth = `Basic ${Buffer.from('e2e-cleanup:disposable').toString('base64')}`;
    const outcomes: CleanupOutcome[] = [];
    for (const postId of createdPostIds) {
      try {
        const response = await page.request.delete(`${mockWpUrl}/posts/${postId}`, { headers: { Authorization: cleanupAuth } });
        if (response.ok()) {
          outcomes.push({ postId, status: 'DELETED', detail: `HTTP ${response.status()}` });
        } else if (response.status() === 404) {
          // Idempotent result: the post is already gone — acceptable.
          outcomes.push({ postId, status: 'ALREADY_DELETED', detail: 'HTTP 404 (already deleted)' });
        } else {
          outcomes.push({ postId, status: 'FAILED', detail: `unexpected HTTP ${response.status()}` });
        }
      } catch (e) {
        outcomes.push({ postId, status: 'FAILED', detail: `network error: ${String(e).slice(0, 200)}` });
      }
    }

    const failed = outcomes.filter((o) => o.status === 'FAILED');
    const confirmed = outcomes.filter((o) => o.status !== 'FAILED');
    if (failed.length > 0) {
      // Leave the IDs on the record; the failure must surface in the test result.
      console.error(`[cleanup] FAILED to delete posts: ${failed.map((f) => `post ${f.postId} (${f.detail})`).join('; ')}`);
      console.error(`[cleanup] tracked post IDs needing manual deletion in the mock WP: ${failed.map((f) => f.postId).join(', ')}`);
      throw new Error(`Post cleanup verification failed: ${failed.map((f) => `post ${f.postId}: ${f.detail}`).join('; ')}`);
    }
    console.log(`[cleanup] confirmed deletion of posts ${confirmed.map((c) => c.postId).join(', ')} from mock WP (${confirmed.map((c) => `${c.postId}: ${c.detail}`).join('; ')})`);
  }
  createdPostIds = [];

  // --- Resources: verified Prisma deleteMany against the dev DB ---
  if (createdResourceIds.length) {
    let client: import('@prisma/client').PrismaClient | null = null;
    try {
      const { PrismaClient } = await import('@prisma/client');
      client = new PrismaClient();
      const result = await client.resource.deleteMany({ where: { id: { in: createdResourceIds } } });
      if (result.count === createdResourceIds.length) {
        console.log(`[cleanup] confirmed deletion of ${result.count}/${createdResourceIds.length} resources from dev DB (${createdResourceIds.join(', ')})`);
      } else {
        // Fewer deletions than tracked: rows were already gone (or filters matched unexpectedly). Surface it.
        console.error(`[cleanup] resource deletion count mismatch: deleted ${result.count} but tracked ${createdResourceIds.length} (${createdResourceIds.join(', ')})`);
        throw new Error(`Resource cleanup verification failed: deleteMany removed ${result.count} rows but ${createdResourceIds.length} resource IDs were tracked (${createdResourceIds.join(', ')}).`);
      }
    } catch (e) {
      console.error(`[cleanup] FAILED to delete resources ${createdResourceIds.join(', ')}:`, e);
      throw new Error(`Resource cleanup failed for IDs ${createdResourceIds.join(', ')}: ${String(e).slice(0, 300)}`);
    } finally {
      // $disconnect must run even when deleteMany/verification throws.
      await client?.$disconnect().catch(() => {});
    }
  }
  createdResourceIds = [];
});

/** Deterministic long fixture built at runtime (>= target words) - English. */
function buildLongFixture(targetWords = 20500): string {
  const paragraphs = [
    'The rule of law is the operating system on which every right the citizen enjoys is rendered',
    'Courts that treat the statute as amended as the whole rule miss the cases that matter most',
    'Institutional design and statutory text point the same way when a charter provision names both procedure and purpose',
    'Precedent confirms the appellate forum reviews the record rather than the argument and may sustain on any ground',
    'Remedies must be effective in law and in practice because a nominal right is an executive denial with paperwork',
  ];
  const blocks: string[] = [];
  let words = 0;
  let section = 0;
  while (words < targetWords) {
    section += 1;
    blocks.push(`# Section ${section} of the doctrine`);
    blocks.push('');
    for (let i = 0; i < 20 && words < targetWords; i++) {
      const para = `${paragraphs[(section + i) % paragraphs.length]}, subsection ${section}.${i}.`;
      blocks.push(para);
      blocks.push('');
      words += (para.match(/\S+/g) as string[]).length;
    }
  }
  return blocks.join('\n');
}

/** Deterministic long fixture built at runtime (>= target words) - Nepali Devanagari. */
function buildNepaliLongFixture(targetWords = 20500): string {
  const nepaliParagraphs = [
    'नेपालको संविधान २०७२ ले नागरिकका मौलिक हक तथा अधिकारहरूको संरक्षण र सम्वर्द्धन गर्ने व्यवस्था गरेको छ',
    'कानूनी राज्यको अवधारणा अन्तर्गत सबै नागरिक कानुनको दृष्टिमा समान हुन् र कानुनको समान संरक्षण पाउनेछन्',
    'अदालतले मिसिल प्रमाणको मूल्याङ्कन गर्दा न्यायको सिद्धान्त र विधिशास्त्रका स्थापित मान्यताहरूलाई आत्मसात् गर्नुपर्छ',
    'पुनरावेदन अदालत वा सर्वोच्च अदालतले न्यायको निस्सा प्रदान गर्दा प्रमाण ऐन तथा न्याय प्रशासन ऐनको पालना गर्नुपर्छ',
    'नागरिक समाज र कानुन व्यवसायीहरूको प्रमुख दायित्व लोकतन्त्र, मानव अधिकार र विधिको शासनको रक्षा गर्नु हो',
  ];
  const blocks: string[] = [];
  let words = 0;
  let section = 0;
  while (words < targetWords) {
    section += 1;
    blocks.push(`# परिच्छेद ${section} - विधिको शासन र संवैधानिक हक`);
    blocks.push('');
    for (let i = 0; i < 20 && words < targetWords; i++) {
      const para = `${nepaliParagraphs[(section + i) % nepaliParagraphs.length]}, दफा ${section}.${i} अनुसार।`;
      blocks.push(para);
      blocks.push('');
      words += (para.match(/\S+/g) as string[]).length;
    }
  }
  return blocks.join('\n');
}

/** Paste a document into the focused editor via the app's paste pipeline. */
async function pasteIntoEditor(page: Page, source: string) {
  await page.evaluate((source) => {
    const ed = document.querySelector<HTMLElement>('.editor-wrapper .ql-editor');
    if (!ed) throw new Error('editor not mounted');
    ed.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ed);
    range.collapse(false);
    sel?.removeAllRanges();
    if (sel) sel.addRange(range);
    const dt = new DataTransfer();
    dt.setData(
      'text/html',
      source.split('\n\n').map((p) => {
        const t = p.trim();
        return t.startsWith('# ') || t.startsWith('# परिच्छेद') ? `<h3>${t.slice(2)}</h3>` : `<p>${t}</p>`;
      }).join('')
    );
    dt.setData('text/plain', source);
    ed.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
  }, source);
}

/** Scroll using real (trusted) wheel bubbles, exactly like a trackpad user. */
async function wheelScroll(page: Page, distance: number) {
  const box = (await page.locator('.editor-wrapper .ql-editor').boundingBox()) ?? { x: 0, y: 0, width: 100, height: 100 };
  const vh = await page.evaluate(() => window.innerHeight);
  const cx = box.x + box.width / 2;
  const cy = Math.min(Math.max(box.y + 80, 20), vh - 10);
  await page.mouse.move(cx, cy);
  let remaining = distance;
  while (remaining > 0) {
    const step = Math.min(remaining, 1000);
    await page.mouse.wheel(0, step);
    remaining -= step;
    await page.waitForTimeout(10);
  }
  await page.waitForTimeout(250);
}

/** Extended editor workspace measurements and caret metrics. */
async function metrics(page: Page) {
  return await page.evaluate(() => {
    const ed = document.querySelector<HTMLElement>('.editor-wrapper .ql-editor');
    const toolbar = document.querySelector<HTMLElement>('.editor-wrapper .ql-toolbar');
    const toolRow = document.querySelector<HTMLElement>('.editor-wrapper .editor-toolbar-row');
    const card = document.querySelector<HTMLElement>('.bg-white, .dark\\:bg-zinc-900.rounded-xl') || document.querySelector<HTMLElement>('form');
    if (!ed || !toolbar) return null;
    const tr = toolbar.getBoundingClientRect();
    const rr = toolRow?.getBoundingClientRect();
    const container = ed.closest('.ql-container');
    const cr = container?.getBoundingClientRect();

    let caretRect = null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      range.collapse(false);
      const rect = range.getBoundingClientRect();
      if (rect && (rect.width || rect.height)) {
        caretRect = { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) };
      } else {
        const span = document.createElement('span');
        span.appendChild(document.createTextNode('​'));
        range.insertNode(span);
        const spanRect = span.getBoundingClientRect();
        caretRect = { top: Math.round(spanRect.top), bottom: Math.round(spanRect.bottom), left: Math.round(spanRect.left), right: Math.round(spanRect.right) };
        span.parentNode?.removeChild(span);
      }
    }

    return {
      clientH: Math.round(ed.clientHeight),
      scrollH: Math.round(ed.scrollHeight),
      scrollTop: Math.round(ed.scrollTop),
      cardScrollTop: card ? Math.round(card.scrollTop) : 0,
      editorTop: Math.round(ed.getBoundingClientRect().top),
      editorBottom: Math.round(ed.getBoundingClientRect().bottom),
      toolbarTop: Math.round(tr.top),
      toolbarRowTop: rr ? Math.round(rr.top) : -1,
      containerH: cr ? Math.round(cr.height) : 0,
      editorOverflowsContainer: cr ? ed.getBoundingClientRect().bottom > cr.bottom + 1 || ed.getBoundingClientRect().top < cr.top - 1 : false,
      innerH: window.innerHeight,
      pageScrollY: Math.round(window.scrollY),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      caretRect,
    };
  });
}

/**
 * Desktop workspace assertions shared by every editor test:
 *  1. the canvas is meaningfully tall (>= 31% of the viewport). A floor-clamped
 *     ~270px editor at 1440x900 is exactly 30% and must NOT satisfy this;
 *  2. the canvas never overflows (gets clipped by) its `.ql-container` box —
 *     the signature of a collapsed flex chain;
 *  3. `min-height` never wins over real workspace space (clientH == the visible
 *     scroll viewport).
 */
function expectDesktopWorkspace(m: NonNullable<Awaited<ReturnType<typeof metrics>>>) {
  expect(m.clientH, 'canvas is at least 31% of the viewport height').toBeGreaterThanOrEqual(0.31 * m.innerH);
  expect(m.clientH, 'canvas matches its container (no floor-clamped overflow)').toBeLessThanOrEqual(m.containerH + 1);
  expect(m.editorOverflowsContainer, 'canvas is not clipped by its container').toBe(false);
}

test.describe('Rich Text Editor workspace', () => {
  test.describe.configure({ mode: 'serial' });

  test('posts: canvas scrolls internally, toolbar + font selector stay visible, caret stays in view while typing (English)', async ({ page }) => {
    const wide = (page.viewportSize() as { width: number }).width >= 1024;
    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(500);

    const initialM = await metrics(page);
    expect(initialM?.scrollTop).toBe(0);

    await pasteIntoEditor(page, buildLongFixture() + '\n\n' + [CANARY, 'scroll-test'].join(' '));
    await page.waitForTimeout(1500);

    const m = await metrics(page);
    expect(m, 'editor mounted').not.toBeNull();
    if (wide) {
      expect(m!.scrollH, 'canvas overflows its own box').toBeGreaterThan(m!.clientH + 5_000);
      expect(m!.clientH, 'canvas bounded inside the viewport workspace').toBeLessThan(m!.innerH);
      expectDesktopWorkspace(m!);
      expect(m!.pageScrollY, 'page does not scroll in the workspace layout').toBeLessThanOrEqual(3);
      expect(m!.cardScrollTop, 'card does not unexpectedly scroll').toBe(0);
      expect(m!.horizontalOverflow, 'no horizontal overflow').toBe(false);
      expect(m!.toolbarRowTop, 'font selector visible').toBeGreaterThanOrEqual(0);
    }
    expect(m!.toolbarTop).toBeGreaterThanOrEqual(-1);

    // Keyboard scrolling (trusted key events): PageDown must scroll the canvas
    // itself. Runs before the big wheel (at document bottom PageDown is a no-op).
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(300);
    const kb = await metrics(page);
    if (wide) {
      expect(kb!.scrollTop, 'PageDown scrolls the canvas itself').toBeGreaterThan(100);
      expect(kb!.pageScrollY, 'keyboard scrolling never scrolls the page').toBeLessThanOrEqual(3);
    }

    await wheelScroll(page, 40_000);
    const mid = await metrics(page);
    expect(mid).not.toBeNull();
    if (wide) {
      expect(mid!.scrollTop, '.ql-editor.scrollTop increases substantially').toBeGreaterThan(1000);
      expect(mid!.cardScrollTop, 'card container does not scroll during editor scroll').toBe(0);
      expect(mid!.editorTop, 'canvas stays in view').toBeLessThan(mid!.innerH);
      expect(mid!.toolbarTop, 'Quill toolbar stays in view while scrolled').toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop, 'font selector stays in view while scrolled').toBeGreaterThanOrEqual(0);
      expect(mid!.pageScrollY, 'page still does not scroll').toBeLessThanOrEqual(3);
    }

    await page.keyboard.press('Control+End');
    await page.waitForTimeout(300);
    const end = await metrics(page);
    if (wide) {
      expect(end!.caretRect, 'caret metrics must be present on desktop').not.toBeNull();
      expect(end!.caretRect!.bottom, 'caret is inside the actual .ql-editor viewport bottom').toBeLessThanOrEqual(end!.editorBottom);
      expect(end!.caretRect!.top, 'caret is inside the actual .ql-editor viewport top').toBeGreaterThanOrEqual(end!.editorTop);
    }
    await page.keyboard.type(' ' + CANARY + 'TYPED');
    await page.waitForTimeout(500);
    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), `${CANARY}TYPED`),
      'typed tail persists in the model'
    ).toBe(true);

    const match = page.url().match(/\/admin\/posts\/(\d+)\/edit/);
    if (match) {
        createdPostIds.push(Number(match[1]));
    }
  });

  test('posts: 20k-word draft round-trips through save + reload + edit (English)', async ({ page }) => {
    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    const postTitle = `EDITOR E2E DRAFT (safe to delete) ${Date.now() % 100000}`;
    await page.fill('#title', postTitle);
    await pasteIntoEditor(page, buildLongFixture(20100) + '\n\n' + [CANARY, 'posts-draft'].join(' '));
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Save Post' }).click();
    await page.waitForFunction(
      () => /\/admin\/posts\/\d+\/edit/.test(location.pathname) && location.search.includes('lang=en'),
      undefined,
      { timeout: 120_000 }
    );

    // Track ID
    const match = page.url().match(/\/admin\/posts\/(\d+)\/edit/);
    if (match) createdPostIds.push(Number(match[1]));

    // Reload and Edit
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.fill('#title', postTitle + ' - UPDATED');
    await page.getByRole('button', { name: 'Update Post' }).click();
    await page.waitForTimeout(1000);

    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(1500);
    const textLen = await page.evaluate(() => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.length ?? 0);
    expect(textLen, 'a full-length document came back from WordPress').toBeGreaterThan(100_000);
    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), `${CANARY} posts-draft`),
      'tail survives the round trip'
    ).toBe(true);
  });

  test('posts: Nepali long content fixture round-trips and verifies unique Nepali tail marker', async ({ page }) => {
    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.fill('#title', `नेपाली परीक्षण पोष्ट ${Date.now() % 100000}`);
    const wide = (page.viewportSize() as { width: number }).width >= 1024;

    await pasteIntoEditor(page, buildNepaliLongFixture(20100) + '\n\n' + [NEPALI_CANARY, 'nepali-tail'].join(' '));
    await page.waitForTimeout(1500);

    const m = await metrics(page);
    expect(m, 'Nepali editor mounted').not.toBeNull();
    if (wide) {
      expect(m!.scrollH).toBeGreaterThan(m!.clientH + 5_000);
      expect(m!.clientH).toBeLessThan(m!.innerH);
      expectDesktopWorkspace(m!);
      expect(m!.horizontalOverflow).toBe(false);
    }

    await wheelScroll(page, 40_000);
    const mid = await metrics(page);
    if (wide) {
      expect(mid!.scrollTop).toBeGreaterThan(1000);
      expect(mid!.cardScrollTop).toBe(0);
      expect(mid!.toolbarTop).toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop).toBeGreaterThanOrEqual(0);
    }

    await page.keyboard.press('Control+End');
    await page.waitForTimeout(300);
    await page.keyboard.type(' ' + NEPALI_CANARY + ' TYPED');
    await page.waitForTimeout(400);

    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), `${NEPALI_CANARY} TYPED`),
      'Nepali typed tail persists'
    ).toBe(true);

    await page.getByRole('button', { name: 'Save Post' }).click();
    await page.waitForFunction(
      () => /\/admin\/posts\/\d+\/edit/.test(location.pathname),
      undefined,
      { timeout: 120_000 }
    );

    // Track ID after the save so the URL has actually changed to /edit
    const match = page.url().match(/\/admin\/posts\/(\d+)\/edit/);
    if (match) createdPostIds.push(Number(match[1]));

    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(1500);

    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), NEPALI_CANARY),
      'unique Nepali tail marker survives round trip'
    ).toBe(true);
  });

  test('resources: Write Note canvas scrolls internally, supports Nepali content, and saved note round-trips + edit', async ({ page }) => {
    await page.goto('/admin/study/resources/new', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Write Note/i }).click();
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(500);

    const resTitle = `नेपाली ल फर्म नोट (safe to delete) ${Date.now() % 100000}`;
    await page.fill('#resource-title', resTitle);
    const wide = (page.viewportSize() as { width: number }).width >= 1024;

    await pasteIntoEditor(page, buildNepaliLongFixture(20100) + '\n\n' + [NEPALI_CANARY, 'resource-nepali'].join(' '));
    await page.waitForTimeout(1500);

    const m = await metrics(page);
    expect(m, 'resource note editor mounted').not.toBeNull();
    if (wide) {
      expect(m!.scrollH).toBeGreaterThan(m!.clientH + 5_000);
      expect(m!.clientH).toBeLessThan(m!.innerH);
      expectDesktopWorkspace(m!);
      expect(m!.horizontalOverflow).toBe(false);
    }

    await wheelScroll(page, 40_000);
    const mid = await metrics(page);
    if (wide) {
      expect(mid!.scrollTop).toBeGreaterThan(1000);
      expect(mid!.cardScrollTop).toBe(0);
      expect(mid!.toolbarTop).toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop).toBeGreaterThanOrEqual(0);
    }

    await page.keyboard.press('Control+End');
    await page.waitForTimeout(300);
    await page.keyboard.type(' ' + NEPALI_CANARY + ' NOTE');
    await page.waitForTimeout(400);

    // Select semester and subject (by placeholder option, NOT by index — the page
    // has extra header selects whose count differs between desktop and mobile).
    const semesterSelect = page.locator('select:has(option:text-is("Select Semester"))');
    await semesterSelect.selectOption({ index: 1 });
    await page.waitForTimeout(400);
    const subjectSelect = page.locator('select:has(option:text-is("Select Subject"))');
    await expect(subjectSelect, 'subject becomes enabled once a semester is chosen').toBeEnabled({ timeout: 20_000 });
    await subjectSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Save as Draft' }).click();
    await page.waitForURL(/\/admin\/study\/resources\/.+\/edit/, { timeout: 120_000 });

    // Track ID
    const matchRes = page.url().match(/\/admin\/study\/resources\/(.+)\/edit/);
    if (matchRes) createdResourceIds.push(matchRes[1]);

    // Reload and Edit
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.fill('#resource-title', resTitle + ' - UPDATED');
    await page.getByRole('button', { name: 'Save as Draft' }).click();
    await page.waitForTimeout(1000);

    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(1500);

    const textLen = await page.evaluate(() => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.length ?? 0);
    expect(textLen, 'Nepali note content survives save/reopen without truncation').toBeGreaterThan(100_000);
    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), NEPALI_CANARY),
      'unique Nepali tail marker survives resource round trip'
    ).toBe(true);
  });
});
