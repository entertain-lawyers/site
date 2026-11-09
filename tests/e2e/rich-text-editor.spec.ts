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
 * Cleanup for the disposable E2E environment.
 *
 * The previous implementation posted to `/api/admin/posts/delete` and
 * `/api/admin/resources/delete` — two routes that do NOT exist in this app —
 * and swallowed every failure with `.catch(() => {})`, so every run silently
 * leaked its fixtures into the mock WordPress and the dev database.
 *
 * Cleanup now targets the actual stores (and is verified, not best-effort):
 *  - posts live only in the E2E mock WordPress (direct DELETE with Basic auth;
 *    the mock accepts any credentials but rejects unauthenticated requests)
 *  - NOTE resources live in the dev database (Prisma deleteMany, count-checked;
 *    the E2E safety halt already guarantees DATABASE_URL is disposable).
 * The full response-inspection + safety-halt hardening lives in the separate
 * E2E cleanup-safety branch; here we keep the same verified-delete core.
 */
test.afterEach(async ({ page }) => {
  // --- Posts: DELETE against the validated E2E mock WordPress ---
  if (createdPostIds.length > 0) {
    const mockWpUrl = process.env.WP_ENGLISH_URL!;
    const cleanupAuth = `Basic ${Buffer.from('e2e-cleanup:disposable').toString('base64')}`;
    const failed: { id: number; detail: string }[] = [];
    const deleted: number[] = [];
    for (const postId of createdPostIds) {
      try {
        const response = await page.request.delete(`${mockWpUrl}/posts/${postId}`, { headers: { Authorization: cleanupAuth } });
        if (response.ok()) {
          deleted.push(postId);
        } else {
          failed.push({ id: postId, detail: `unexpected HTTP ${response.status()}` });
        }
      } catch (e) {
        failed.push({ id: postId, detail: `network error: ${String(e).slice(0, 200)}` });
      }
    }
    if (failed.length > 0) {
      console.error(`[cleanup] FAILED to delete posts: ${failed.map((f) => `post ${f.id} (${f.detail})`).join('; ')}`);
      console.error(`[cleanup] tracked IDs needing manual deletion: ${failed.map((f) => f.id).join(', ')}`);
      throw new Error(`Post cleanup failed: ${failed.map((f) => `post ${f.id}: ${f.detail}`).join('; ')}`);
    }
    console.log(`[cleanup] confirmed deletion of posts ${deleted.join(', ')} from the E2E mock WP`);
    createdPostIds = [];
  }

  // --- Resources: verified deleteMany against the disposable dev database ---
  if (createdResourceIds.length > 0) {
    let client: import('@prisma/client').PrismaClient | null = null;
    try {
      const { PrismaClient } = await import('@prisma/client');
      client = new PrismaClient();
      const result = await client.resource.deleteMany({ where: { id: { in: createdResourceIds } } });
      if (result.count !== createdResourceIds.length) {
        throw new Error(`deleteMany removed ${result.count} rows but ${createdResourceIds.length} IDs were tracked (${createdResourceIds.join(', ')})`);
      }
      console.log(`[cleanup] confirmed deletion of ${result.count}/${createdResourceIds.length} resources from the dev DB`);
    } catch (e) {
      console.error(`[cleanup] FAILED to delete resources ${createdResourceIds.join(', ')}:`, e);
      throw new Error(`Resource cleanup failed for IDs ${createdResourceIds.join(', ')}: ${String(e).slice(0, 300)}`);
    } finally {
      // $disconnect must run even when deleteMany/verification throws.
      await client?.$disconnect().catch(() => {});
    }
    createdResourceIds = [];
  }
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

/** Scroll the PAGE (for document-scroll mode) using real wheel events. */
async function wheelScrollPage(page: Page, distance: number) {
  const vh = await page.evaluate(() => window.innerHeight);
  const cx = vh / 2;
  const cy = vh / 2;
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

/** Scroll UP with real wheel events (reverse scrolling restores natural toolbar position). */
async function wheelScrollPageUp(page: Page, distance: number) {
  const vh = await page.evaluate(() => window.innerHeight);
  await page.mouse.move(vh / 2, vh / 2);
  let remaining = distance;
  while (remaining > 0) {
    const step = Math.min(remaining, 1000);
    await page.mouse.wheel(0, -step);
    remaining -= step;
    await page.waitForTimeout(10);
  }
  await page.waitForTimeout(250);
}

/** Pasting collapses the caret at the document end, and the browser scrolls
 * the caret into view (page lands at the bottom, and Quill can nudge the page
 * once more afterwards). Tests drop the selection and scroll back to the top
 * to observe the toolbar's natural, un-stuck position. */
async function resetPageScrollToTop(page: Page) {
  await page.evaluate(() => {
    window.getSelection()?.removeAllRanges();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(250);
}

/** Extended editor workspace measurements and caret metrics. */
async function metrics(page: Page) {
  return await page.evaluate(() => {
    const ed = document.querySelector<HTMLElement>('.editor-wrapper .ql-editor');
    const toolbar = document.querySelector<HTMLElement>('.editor-wrapper .ql-toolbar');
    const toolRow = document.querySelector<HTMLElement>('.editor-wrapper .editor-toolbar-row');
    const wrapper = document.querySelector<HTMLElement>('.editor-wrapper');
    const card = document.querySelector<HTMLElement>('.bg-white, .dark\\:bg-zinc-900.rounded-xl') || document.querySelector<HTMLElement>('form');
    if (!ed || !toolbar || !wrapper) return null;
    const tr = toolbar.getBoundingClientRect();
    const rr = toolRow?.getBoundingClientRect();
    const wr = wrapper.getBoundingClientRect();

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

    const isDocumentMode = wrapper.classList.contains('document-scroll-mode');

    return {
      clientH: Math.round(ed.clientHeight),
      scrollH: Math.round(ed.scrollHeight),

      scrollTop: Math.round(ed.scrollTop),
      cardScrollTop: card ? Math.round(card.scrollTop) : 0,
      editorTop: Math.round(ed.getBoundingClientRect().top),
      editorBottom: Math.round(ed.getBoundingClientRect().bottom),
      toolbarTop: Math.round(tr.top),
      toolbarBottom: Math.round(tr.bottom),
      toolbarRowTop: rr ? Math.round(rr.top) : -1,
      toolbarRowBottom: rr ? Math.round(rr.bottom) : -1,
      toolbarRowMarginTop: rr ? Math.round(parseFloat(getComputedStyle((toolRow as HTMLElement)).marginTop)) : 0,
      toolbarRowMarginBottom: rr ? Math.round(parseFloat(getComputedStyle((toolRow as HTMLElement)).marginBottom)) : 0,
      innerH: window.innerHeight,
      pageScrollY: Math.round(window.scrollY),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      caretRect,
      isDocumentMode,
      wrapperTop: Math.round(wr.top),
      wrapperBottom: Math.round(wr.bottom),
      wrapperHeight: Math.round(wr.height),
    };
  });
}

test.describe('Rich Text Editor workspace', () => {
  test.describe.configure({ mode: 'serial' });

  test('posts: document-scroll mode - page scrolls, toolbar becomes sticky, caret stays in view (English)', async ({ page }) => {
    const wide = (page.viewportSize() as { width: number }).width >= 1024;
    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(500);

    const initialM = await metrics(page);
    expect(initialM, 'editor mounted').not.toBeNull();
    expect(initialM!.isDocumentMode, 'editor should be in document-scroll-mode').toBe(true);
    expect(initialM!.scrollTop, '.ql-editor.scrollTop should be 0 in document mode').toBe(0);

    await pasteIntoEditor(page, buildLongFixture() + '\n\n' + [CANARY, 'scroll-test'].join(' '));
    await page.waitForTimeout(1500);
    // A paste collapses the caret at the document end and the browser scrolls
    // it into view; scroll back so the toolbar's natural position is observable.
    await resetPageScrollToTop(page);

    const m = await metrics(page);
    expect(m, 'editor mounted after paste').not.toBeNull();
    if (wide) {
      expect(m!.scrollH, 'canvas content height exceeds viewport').toBeGreaterThan(m!.innerH + 5_000);
      expect(m!.scrollTop, '.ql-editor.scrollTop stays 0 in document mode').toBe(0);
      expect(m!.pageScrollY, 'page starts at top after paste + reset').toBeLessThanOrEqual(3);
      expect(m!.horizontalOverflow, 'no horizontal overflow').toBe(false);
      // Toolbar starts at its original (un-stuck) position: below the viewport top.
      expect(m!.toolbarRowTop, 'font selector at natural position initially').toBeGreaterThan(0);
    } else {
      // Mobile/tablet: toolbar row sits below the fixed admin top bar and starts un-stuck.
      expect(m!.toolbarRowTop, 'font selector starts below the fixed admin nav').toBeGreaterThan(64);
    }
    expect(m!.toolbarTop).toBeGreaterThanOrEqual(-1);

    // Scroll down through the document using PAGE scroll (wheel on page)
    await wheelScrollPage(page, 40_000);
    const mid = await metrics(page);
    expect(mid).not.toBeNull();
    if (wide) {
      expect(mid!.scrollTop, '.ql-editor.scrollTop remains 0 in document mode').toBe(0);
      expect(mid!.pageScrollY, 'page scrolls substantially').toBeGreaterThan(1000);
      expect(mid!.toolbarRowTop, 'font selector becomes sticky at viewport top').toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop, 'font selector stuck near top of viewport').toBeLessThanOrEqual(50);
      // Font selector row and Quill toolbar never overlap: the sticky toolbar
      // starts at (or below) the bottom of the row above it.
      expect(mid!.toolbarTop, 'Quill toolbar below the font selector row (no overlap)')
        .toBeGreaterThanOrEqual(mid!.toolbarRowBottom - 1);
      expect(mid!.editorBottom, 'editor content continues below sticky toolbar').toBeGreaterThan(mid!.innerH);
    } else {
      // Mobile: sticky row must stay visible BELOW the fixed admin nav (64px),
      // not slide under it and not float far mid-screen.
      expect(mid!.toolbarRowTop, 'font selector sticks right below the fixed admin nav').toBeGreaterThanOrEqual(59);
      expect(mid!.toolbarRowTop, 'font selector stays within the sticky band').toBeLessThanOrEqual(90);
      expect(mid!.toolbarTop, 'Quill toolbar below the font selector row (no overlap)')
        .toBeGreaterThanOrEqual(mid!.toolbarRowBottom - 1);
    }

    // Continue scrolling to near the end of the editor
    await wheelScrollPage(page, 40_000);
    const mid2 = await metrics(page);
    expect(mid2).not.toBeNull();
    if (wide) {
      // Toolbar should still be sticky while editor content remains
      expect(mid2!.toolbarRowTop, 'font selector remains sticky').toBeGreaterThanOrEqual(0);
      expect(mid2!.toolbarRowTop, 'font selector stuck near top').toBeLessThanOrEqual(50);
      expect(mid2!.toolbarTop, 'Quill toolbar remains sticky and unoverlapped')
        .toBeGreaterThanOrEqual(mid2!.toolbarRowBottom - 1);
    } else {
      expect(mid2!.toolbarRowTop, 'font selector remains sticky below admin nav').toBeGreaterThanOrEqual(59);
      expect(mid2!.toolbarRowTop, 'font selector stays within the sticky band').toBeLessThanOrEqual(90);
    }

    // Reverse scrolling: toolbar goes back to its natural position near the top
    await wheelScrollPageUp(page, 90_000);
    const backAtTop = await metrics(page);
    expect(backAtTop).not.toBeNull();
    expect(backAtTop!.pageScrollY, 'page is back at the top after reverse scrolling').toBeLessThanOrEqual(3);
    if (m!.toolbarRowTop > 0) {
      expect(Math.abs(backAtTop!.toolbarRowTop - m!.toolbarRowTop), 'natural position restores exactly after reverse scroll')
        .toBeLessThanOrEqual(3);
    }

    // Scroll to end and verify caret positioning. The browser smooth-scrolls
    // toward the caret, so poll rather than assume a fixed delay.
    await page.keyboard.press('Control+End');
    await page.waitForFunction(
      () => {
        const s = window.getSelection();
        if (!s || s.rangeCount === 0) return false;
        const r = s.getRangeAt(0).cloneRange();
        r.collapse(false);
        const rr = r.getBoundingClientRect();
        return !!rr && rr.bottom < window.innerHeight + 2 && rr.top > -2;
      },
      undefined,
      { timeout: 10_000 }
    );
    await page.waitForTimeout(200);
    const end = await metrics(page);
    if (wide) {
      expect(end!.caretRect, 'caret metrics must be present on desktop').not.toBeNull();
      expect(end!.caretRect!.bottom, 'caret is inside the viewport').toBeLessThanOrEqual(end!.innerH);
      expect(end!.caretRect!.top, 'caret is inside the viewport').toBeGreaterThanOrEqual(0);
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

  test('posts: document-scroll mode - toolbar stops sticking at editor boundary', async ({ page }) => {
    const wide = (page.viewportSize() as { width: number }).width >= 1024;
    if (!wide) test.skip(true, 'Desktop-only test');

    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(500);

    await pasteIntoEditor(page, buildLongFixture() + '\n\n' + [CANARY, 'boundary-test'].join(' '));
    await page.waitForTimeout(1500);
    await resetPageScrollToTop(page);

    // The editor is the last tall block on this page, so its bottom edge sits at
    // the very end of the scrollable document. Append a spacer AFTER the wrapper
    // so the release phase (wrapper bottom crossing the sticky line) becomes a
    // reachable, observable scroll position — exactly like a page with content
    // below the editor (which the CSS must and does respect).
    await page.evaluate(() => {
      const wrap = document.querySelector('.editor-wrapper');
      if (!wrap) throw new Error('editor wrapper not found');
      const spacer = document.createElement('div');
      spacer.id = 'e2e-boundary-spacer';
      spacer.style.height = '200vh';
      spacer.textContent = 'page content below the editor';
      wrap.after(spacer);
    });

    // Phase 1: position just before the release point — the editor still spans
    // most of the viewport from its bottom edge, and the toolbar must be stuck.
    await page.evaluate(() => {
      const wr = document.querySelector('.editor-wrapper')!.getBoundingClientRect();
      const y = Math.round(window.scrollY + wr.bottom - window.innerHeight + 80);
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    await page.waitForTimeout(400);
    let m = await metrics(page);
    expect(m).not.toBeNull();
    expect(m!.wrapperBottom, 'wrapper bottom just inside the viewport').toBeLessThanOrEqual(m!.innerH - 40);
    expect(m!.toolbarRowTop, 'toolbar stuck while the editor spans the viewport').toBeGreaterThanOrEqual(0);
    expect(m!.toolbarRowTop, 'toolbar stuck in the sticky band').toBeLessThanOrEqual(50);
    expect(m!.toolbarTop, 'Quill toolbar below the row (no overlap)').toBeGreaterThanOrEqual(m!.toolbarRowBottom - 1);

    // Phase 2: wheel gently across the release point — once the wrapper's
    // bottom edge crosses the sticky line the toolbar must RELEASE: it docks
    // to (then scrolls away with) the editor's bottom edge instead of staying
    // pinned at the viewport top. Sticky docking keeps the row's margin box
    // inside the wrapper, so the row bottom ends at wrapper bottom minus the
    // row's own bottom margin (0.75rem from the wrapper's `space-y-3`).
    for (let i = 0; i < 60 && m && m.wrapperBottom > -80; i++) {
      await wheelScrollPage(page, 500);
      m = await metrics(page);
    }
    expect(m).not.toBeNull();
    expect(m!.wrapperBottom, 'wrapper bottom above the viewport top').toBeLessThanOrEqual(-40);
    const rowH = m!.toolbarRowBottom - m!.toolbarRowTop;
    const dockedTop = m!.wrapperBottom - rowH - m!.toolbarRowMarginBottom;
    expect(m!.toolbarRowTop, 'toolbar released: not pinned at the viewport top').toBeLessThan(0);
    expect(m!.toolbarRowTop, 'toolbar docked at the editor boundary (margin box inside the wrapper)')
      .toBeGreaterThanOrEqual(dockedTop - 3);
    expect(m!.toolbarRowTop)
      .toBeLessThanOrEqual(dockedTop + 3);
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

    // Sticky behavior must hold in the EDIT workflow too (the reopened editor
    // uses the same document-scroll workspace): scroll down into the document
    // and verify the toolbar stacks in its sticky band in every viewport.
    await page.evaluate(() => window.scrollTo({ top: 5_000, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const editSticky = await metrics(page);
    expect(editSticky, 'edit-page editor mounted').not.toBeNull();
    const wideHere = (page.viewportSize() as { width: number }).width >= 1024;
    if (wideHere) {
      expect(editSticky!.toolbarRowTop, 'edit workflow: font selector stuck at viewport top').toBeGreaterThanOrEqual(0);
      expect(editSticky!.toolbarRowTop, 'edit workflow: font selector stuck near the top').toBeLessThanOrEqual(50);
    } else {
      expect(editSticky!.toolbarRowTop, 'edit workflow: font selector sticks below the fixed admin nav').toBeGreaterThanOrEqual(59);
      expect(editSticky!.toolbarRowTop, 'edit workflow: font selector stays within the sticky band').toBeLessThanOrEqual(90);
    }
    expect(editSticky!.toolbarTop, 'edit workflow: Quill toolbar below the row (no overlap)')
      .toBeGreaterThanOrEqual(editSticky!.toolbarRowBottom - 1);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
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
    // Paste places the caret at the document end (page scrolls to it — on
    // mobile the settings sidebar sits below the editor, so the toolbar may
    // already have released). Scroll back up to exercise sticking from the top.
    await resetPageScrollToTop(page);

    const m = await metrics(page);
    expect(m, 'Nepali editor mounted').not.toBeNull();
    if (wide) {
      // Document-scroll mode: the canvas grows naturally (scrollTop stays 0,
      // the PAGE scrolls), so content far taller than the viewport is expected.
      expect(m!.scrollTop, 'Nepali canvas does not scroll internally').toBe(0);
      expect(m!.scrollH, 'Nepali document far exceeds the viewport height').toBeGreaterThan(m!.innerH + 5_000);
      expect(m!.horizontalOverflow).toBe(false);
    }

    // Page scrolls in document mode; the toolbar sticks right under the fixed
    // admin nav on <lg (4rem) and at the top on lg+.
    await wheelScrollPage(page, 40_000);
    const mid = await metrics(page);
    if (wide) {
      expect(mid!.pageScrollY, 'page scrolled through the Nepali document').toBeGreaterThan(1000);
      expect(mid!.toolbarRowTop, 'font selector stuck near the top').toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop, 'font selector stays in the sticky band').toBeLessThanOrEqual(50);
      expect(mid!.toolbarTop, 'Quill toolbar below the row (no overlap)').toBeGreaterThanOrEqual(mid!.toolbarRowBottom - 1);
    } else {
      expect(mid!.toolbarRowTop, 'font selector sticks below the fixed admin nav').toBeGreaterThanOrEqual(59);
      expect(mid!.toolbarRowTop, 'font selector stays within the sticky band').toBeLessThanOrEqual(90);
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
    await page.fill('input[type="text"]', resTitle);
    const wide = (page.viewportSize() as { width: number }).width >= 1024;

    await pasteIntoEditor(page, buildNepaliLongFixture(20100) + '\n\n' + [NEPALI_CANARY, 'resource-nepali'].join(' '));
    await page.waitForTimeout(1500);

    const m = await metrics(page);
    expect(m, 'resource note editor mounted').not.toBeNull();
    if (wide) {
      expect(m!.scrollH).toBeGreaterThan(m!.clientH + 5_000);
      expect(m!.clientH).toBeLessThan(m!.innerH);
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

    // Select semester and subject
    await page.evaluate(() => {
      const semester = document.querySelectorAll('select')[1];
      const option = [...semester.options].find((o) => o.value);
      if (option) {
        semester.value = option.value;
        semester.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const subject = document.querySelectorAll('select')[2];
      const option = [...subject.options].find((o) => o.value);
      if (option) {
        subject.value = option.value;
        subject.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Save as Draft' }).click();
    await page.waitForURL(/\/admin\/study\/resources\/.+\/edit/, { timeout: 120_000 });

    // Track ID
    const matchRes = page.url().match(/\/admin\/study\/resources\/(.+)\/edit/);
    if (matchRes) createdResourceIds.push(matchRes[1]);

    // Reload and Edit
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.fill('input[type="text"]', resTitle + ' - UPDATED');
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
