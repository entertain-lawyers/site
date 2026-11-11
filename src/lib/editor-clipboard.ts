import { sanitizeHtml } from '@/lib/sanitize';

/**
 * MS Word desktop exports lists as ordinary paragraphs carrying
 * `mso-list:l0 level1 lfo1` styles plus a fake marker span, not as <ol>/<ul>.
 * Quill has a built-in Word matcher for this, but it only runs when the HTML
 * root still has `xmlns:w="...office:word"` — sanitizeHtml removes the <html>
 * wrapper, so the matcher never fires. Convert to real lists ourselves,
 * before sanitize runs. Uses the <style> sheet's
 * `@list lX:levelY {mso-level-number-format:bullet}` rules to tell bullets
 * from numbers, falling back to the marker text.
 */
function convertWordFakeLists(html: string): string {
  if (!/\bmso-list\s*:/i.test(html)) return html;

  // Sheet rules: key "lId:level" -> bullet?
  const bulletLevels = new Map<string, boolean>();
  for (const m of html.matchAll(/@list\s+l(\d+):level(\d+)\s*{([^}]*)}/gi)) {
    bulletLevels.set(`${m[1]}:${m[2]}`, /mso-level-number-format\s*:\s*bullet/i.test(m[3]));
  }

  const paragraphRe = /<p(\s[^>]*?)?>([\s\S]*?)<\/p>/gi;
  const items: Array<{ start: number; end: number; listId: string; level: number; content: string; isContinue: boolean }> = [];
  for (const m of html.matchAll(paragraphRe)) {
    const attrs = m[1] || '';
    const styleMatch = /mso-list\s*:\s*([^;"']*)/i.exec(attrs);
    if (!styleMatch) continue;
    const value = styleMatch[1] || '';
    const idMatch = /\bl(\d+)\b/i.exec(value);
    if (!idMatch) continue;
    const levelMatch = /\blevel\s*(\d+)/i.exec(value);
    const start = m.index;
    const end = start + m[0].length;
    // Remove the fake marker span Word puts before each item's text.
    const content = (m[2] || '').replace(/<span[^>]*mso-list\s*:\s*Ignore[^>]*>[\s\S]*?<\/span>/gi, '');
    items.push({
      start,
      end,
      listId: idMatch[1],
      level: levelMatch ? Math.min(Number(levelMatch[1]), 5) : 1,
      content,
      isContinue: /continue/i.test(value),
    });
  }
  if (items.length === 0) return html;

  let out = '';
  let cursor = 0;
  // Number of currently open <li> elements (lists nest inside the parent li).
  let liDepth = 0;
  const open: Array<{ tag: string; listId: string }> = [];
  const closeLi = () => {
    if (liDepth > 0) {
      out += '</li>';
      liDepth -= 1;
    }
  };
  const closeToDepth = (depth: number) => {
    while (open.length > depth) {
      closeLi();
      out += open.pop()!.tag === 'ol' ? '</ol>' : '</ul>';
    }
  };

  for (const item of items) {
    out += html.slice(cursor, item.start);
    cursor = item.end;

    const listTag = bulletLevels.get(`${item.listId}:${item.level}`) ? 'ul' : 'ol';

    // Wrapped continuation paragraph of the previous list item: keep it
    // inside the currently open <li>.
    if (item.isContinue && liDepth > 0) {
      out += item.content;
      continue;
    }

    if (open.length > item.level) closeToDepth(item.level);
    if (open.length === item.level && open[open.length - 1]?.listId !== item.listId) {
      closeToDepth(item.level - 1);
    }
    let openedList = false;
    while (open.length < item.level) {
      // A nested list opens INSIDE the still-open parent <li>.
      out += `<${listTag}>`;
      open.push({ tag: listTag, listId: item.listId });
      openedList = true;
    }
    if (!openedList) closeLi();
    out += `<li>${item.content}`;
    liDepth += 1;
  }
  closeToDepth(0);
  out += html.slice(cursor);
  return out;
}

/**
 * Normalizes and sanitizes HTML retrieved from the clipboard (Word, Google Docs,
 * external websites, or other rich-text editors) so it can safely be converted
 * into a Quill Delta while preserving rich formatting.
 */
export function preparePastedHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let html = rawHtml;

  // 1. Extract content from standard HTML clipboard fragment markers if present
  // (Windows clipboard, MS Word, and Google Docs often wrap with StartFragment / EndFragment).
  const startFragmentMatch = /<!--StartFragment-->/i.exec(html);
  const endFragmentMatch = /<!--EndFragment-->/i.exec(html);
  if (startFragmentMatch && endFragmentMatch && endFragmentMatch.index > startFragmentMatch.index) {
    html = html.slice(startFragmentMatch.index + startFragmentMatch[0].length, endFragmentMatch.index);
  }

  // 2. Clean up common Word / LibreOffice XML annotations
  // e.g. <o:p></o:p>, <!--[if !supportLists]-->...<!--[endif]-->
  html = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<\/?[a-z0-9]+:[a-z0-9]+[^>]*>/gi, '');

  // 3. Normalize Google Docs bold wrapper
  // Google Docs wraps the whole pasted section in <b style="font-weight:normal;" id="docs-internal-guid-...">
  html = html.replace(/<b\s+[^>]*id=["']docs-internal-guid-[^"']*["'][^>]*>([\s\S]*?)<\/b>/gi, '$1');

  // 3b. Convert MS Word's fake lists (mso-list paragraphs) into real <ol>/<ul>.
  // Must run before sanitize, which strips the mso-list styles Quill's own
  // Word matcher would need — and the matcher cannot run at all because the
  // <html xmlns:w> root is removed by sanitize.
  html = convertWordFakeLists(html);

  // 4. Sanitize through the existing safe HTML pipeline (strips scripts, event handlers,
  // dangerous protocols like javascript:, and unsupported css properties).
  let sanitized = sanitizeHtml(html);

  // 5. Clean up excessive empty paragraphs (collapse 3+ consecutive empty lines to 1)
  sanitized = sanitized.replace(/(?:<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|&#160;|\s)*<\/p>\s*){3,}/gi, '<p><br></p>');

  // 6. Fix malformed list nesting (e.g. <ol><ol> or <ul><ul> not inside an <li>)
  // Ensure nested lists are valid HTML list items so Quill converts them cleanly.
  sanitized = sanitized.replace(/(<ul(?:\s[^>]*)?>|<ol(?:\s[^>]*)?>)\s*(<ul(?:\s[^>]*)?>|<ol(?:\s[^>]*)?>)/gi, '$1<li>$2');

  return sanitized.trim();
}

/**
 * Inserts processed clipboard content (HTML or plain text fallback) at the
 * editor's current cursor position, replacing any active selection without
 * touching unrelated content.
 */
export function insertClipboardContent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  clipboardData: { html?: string | null; text?: string | null }
): boolean {
  if (!editor) return false;

  const rawHtml = clipboardData.html?.trim() || '';
  const rawText = clipboardData.text || '';

  if (!rawHtml && !rawText) return false;

  try {
    const range = editor.getSelection(true) || { index: editor.getLength() - 1, length: 0 };
    const formats = editor.getFormat(range.index) || {};

    let pastedDelta;
    if (rawHtml) {
      const sanitizedHtml = preparePastedHtml(rawHtml);
      if (sanitizedHtml) {
        pastedDelta = editor.clipboard.convert({ html: sanitizedHtml, text: rawText }, formats);
      }
    }

    if (!pastedDelta || pastedDelta.length() === 0) {
      if (!rawText) return false;
      pastedDelta = editor.clipboard.convert({ text: rawText }, formats);
    }

    if (!pastedDelta || pastedDelta.length() === 0) return false;

    // Use Quill Delta constructor or parchment
    const Delta = editor.constructor.import ? editor.constructor.import('delta') : editor.clipboard.convert({ text: '' }).constructor;
    const delta = new Delta().retain(range.index).delete(range.length).concat(pastedDelta);

    editor.updateContents(delta, 'user');
    editor.setSelection(range.index + pastedDelta.length(), 0, 'user');
    editor.scrollSelectionIntoView();
    return true;
  } catch (err) {
    console.error('[editor-clipboard] failed to insert pasted content', err);
    return false;
  }
}
