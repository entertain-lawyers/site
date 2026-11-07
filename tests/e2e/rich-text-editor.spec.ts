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
 * Environment: see playwright.config.ts — disposable local dev server only.
 */

const PASSED_ENV = process.env.EDITOR_E2E === '1';
test.skip(
  !PASSED_ENV,
  'Editor E2E requires EDITOR_E2E=1 (and a disposable local environment with a test account).'
);

const CANARY = 'END-OF-FIXTURE-EDIT-CANARY';

/** Deterministic long fixture built at runtime (>= target words). */
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
        return t.startsWith('# ') ? `<h3>${t.slice(2)}</h3>` : `<p>${t}</p>`;
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

/** Editor workspace measurements on the current page. */
async function metrics(page: Page) {
  return await page.evaluate(() => {
    const ed = document.querySelector<HTMLElement>('.editor-wrapper .ql-editor');
    const toolbar = document.querySelector<HTMLElement>('.editor-wrapper .ql-toolbar');
    const toolRow = document.querySelector<HTMLElement>('.editor-wrapper .editor-toolbar-row');
    if (!ed || !toolbar) return null;
    const tr = toolbar.getBoundingClientRect();
    const rr = toolRow?.getBoundingClientRect();
    return {
      clientH: Math.round(ed.clientHeight),
      scrollH: Math.round(ed.scrollHeight),
      editorTop: Math.round(ed.getBoundingClientRect().top),
      editorBottom: Math.round(ed.getBoundingClientRect().bottom),
      toolbarTop: Math.round(tr.top),
      toolbarRowTop: rr ? Math.round(rr.top) : -1,
      innerH: window.innerHeight,
      pageScrollY: Math.round(window.scrollY),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

test.describe('Rich Text Editor workspace', () => {
  test.describe.configure({ mode: 'serial' });

  test('posts: canvas scrolls internally, toolbar + font selector stay visible, caret stays in view while typing', async ({ page }) => {
    const wide = (page.viewportSize() as { width: number }).width >= 1024;
    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(500);
    await pasteIntoEditor(page, buildLongFixture() + '\n\n' + [CANARY, 'scroll-test'].join(' '));
    await page.waitForTimeout(1500);

    const m = await metrics(page);
    expect(m, 'editor mounted').not.toBeNull();
    if (wide) {
      expect(m!.scrollH, 'canvas overflows its own box').toBeGreaterThan(m!.clientH + 5_000);
      expect(m!.clientH, 'canvas bounded inside the viewport workspace').toBeLessThan(m!.innerH);
      expect(m!.pageScrollY, 'page does not scroll in the workspace layout').toBeLessThanOrEqual(3);
      expect(m!.horizontalOverflow, 'no horizontal overflow').toBe(false);
      expect(m!.toolbarRowTop, 'font selector visible').toBeGreaterThanOrEqual(0);
    }
    expect(m!.toolbarTop).toBeGreaterThanOrEqual(-1);

    await wheelScroll(page, 40_000);
    const mid = await metrics(page);
    expect(mid).not.toBeNull();
    if (wide) {
      expect(mid!.editorTop, 'canvas stays in view').toBeLessThan(m!.innerH);
      expect(mid!.toolbarTop, 'Quill toolbar stays in view while scrolled').toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop, 'font selector stays in view while scrolled').toBeGreaterThanOrEqual(0);
      expect(mid!.pageScrollY, 'page still does not scroll').toBeLessThanOrEqual(3);
    }

    await page.keyboard.press('Control+End');
    await page.waitForTimeout(300);
    const end = await metrics(page);
    if (wide) {
      expect(end!.editorBottom, 'typable area on screen at the end of the document').toBeLessThanOrEqual(end!.innerH);
      expect(end!.editorBottom).toBeGreaterThan(0);
    }
    await page.keyboard.type(' ' + CANARY + 'TYPED');
    await page.waitForTimeout(500);
    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), `${CANARY}TYPED`),
      'typed tail persists in the model'
    ).toBe(true);
  });

  test('posts: 20k-word draft round-trips through save + reload without truncation', async ({ page }) => {
    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.fill('#title', `EDITOR E2E DRAFT (safe to delete) ${Date.now() % 100000}`);
    await pasteIntoEditor(page, buildLongFixture(20100) + '\n\n' + [CANARY, 'posts-draft'].join(' '));
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Save Post' }).click();
    // The create flow keeps editing via history.replaceState on the new post.
    await page.waitForFunction(
      () => /\/admin\/posts\/\d+\/edit/.test(location.pathname) && location.search.includes('lang=en'),
      undefined,
      { timeout: 120_000 }
    );
    // Reload: the edit page re-fetches from WordPress and hydrates the editor.
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

  test('resources: Write Note canvas scrolls internally and a saved note round-trips', async ({ page }) => {
    await page.goto('/admin/study/resources/new', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Write Note/i }).click();
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(500);
    // The form requires a title plus semester/subject before it will save.
    await page.fill('input[type="text"]', `EDITOR E2E NOTE (safe to delete) ${Date.now() % 100000}`);
    const wide = (page.viewportSize() as { width: number }).width >= 1024;
    await pasteIntoEditor(page, buildLongFixture(20100) + '\n\n' + [CANARY, 'resource-draft'].join(' '));
    await page.waitForTimeout(1500);

    const m = await metrics(page);
    expect(m, 'note editor mounted').not.toBeNull();
    if (wide) {
      expect(m!.scrollH).toBeGreaterThan(m!.clientH + 5_000);
      expect(m!.clientH).toBeLessThan(m!.innerH);
      expect(m!.horizontalOverflow).toBe(false);
    }
    await wheelScroll(page, 40_000);
    const mid = await metrics(page);
    if (wide) {
      expect(mid!.toolbarTop).toBeGreaterThanOrEqual(0);
      expect(mid!.toolbarRowTop).toBeGreaterThanOrEqual(0);
    }

    await page.keyboard.press('Control+End');
    await page.waitForTimeout(300);
    await page.keyboard.type(' ' + CANARY + 'NOTE');
    await page.waitForTimeout(400);
    expect(
      await page.evaluate((mk) => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.includes(mk), `${CANARY}NOTE`),
      'typed tail persists'
    ).toBe(true);

    // Semester + subject selects are required to save; pick the first real
    // option of each exactly like a user would.
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
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.editor-wrapper .ql-editor', { timeout: 90_000 });
    await page.waitForTimeout(1500);
    const textLen = await page.evaluate(() => document.querySelector('.editor-wrapper .ql-editor')?.textContent?.length ?? 0);
    expect(textLen, 'note content survives save/reopen without truncation').toBeGreaterThan(100_000);
  });
});
