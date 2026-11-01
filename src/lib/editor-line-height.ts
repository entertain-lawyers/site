/**
 * Line spacing (line-height) options, constants, and DOM synchronization helpers.
 * Pure logic safe for both SSR/Node and browser runtime.
 */

export const LINE_HEIGHT_OPTIONS = ['1.0', '1.15', '1.5', '1.75', '2.0'] as const;
export type LineHeightOption = (typeof LINE_HEIGHT_OPTIONS)[number];

export const LINE_HEIGHT_WHITELIST = ['1', '1.0', '1.15', '1.5', '1.75', '2', '2.0'];

/**
 * Checks whether a given string or value is allowed for line-height.
 */
export function isAllowedLineHeight(value: unknown): boolean {
  if (!value) return false;
  const str = String(value).trim();
  return LINE_HEIGHT_WHITELIST.includes(str);
}

/**
 * Normalizes line height representations (e.g. integer "1" -> "1.0", "2" -> "2.0")
 * to match toolbar option values.
 */
export function normalizeLineHeight(value: unknown): string {
  if (!value) return '';
  const str = String(value).trim();
  if (str === '1' || str === '1.0') return '1.0';
  if (str === '2' || str === '2.0') return '2.0';
  return str;
}

/**
 * Synchronizes list item line-heights from Quill DOM to semantic HTML string.
 * Quill 2 getSemanticHTML() cleanses lists into semantic <ul>/<ol> but drops
 * inline styles on <li> blots. This ensures <li> line-height styles survive.
 */
export function syncListLineHeights(html: string, root?: HTMLElement | null): string {
  if (!root) return html;
  const rootLis = Array.from(root.querySelectorAll('li'));
  if (!rootLis.some((li) => li.style && li.style.lineHeight)) return html;

  let liIndex = 0;
  return html.replace(/<li(\b[^>]*)>/gi, (match, attrs) => {
    const rootLi = rootLis[liIndex++];
    if (!rootLi || !rootLi.style || !rootLi.style.lineHeight) return match;
    const lh = rootLi.style.lineHeight;
    if (/\bstyle\s*=/i.test(attrs)) {
      if (/line-height/i.test(attrs)) return match;
      return match.replace(/style\s*=\s*(['"])/i, `style=$1line-height: ${lh}; `);
    }
    return `<li style="line-height: ${lh};"${attrs}>`;
  });
}
