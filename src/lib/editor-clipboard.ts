import { sanitizeHtml } from '@/lib/sanitize';

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
