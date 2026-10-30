import sanitizeHtmlLib from 'sanitize-html';

/**
 * Allowed markup is the same reading surface the old site used: headings,
 * paragraphs, lists, tables, quotes, images and links. Anything active
 * (script, iframe, style tag, event handlers) is dropped.
 *
 * DOMPurify was replaced because its server build needs jsdom, whose CJS
 * dependency chain cannot be loaded by the Turbopack server runtime on Vercel.
 * sanitize-html is pure JavaScript and behaves the same on server and client.
 *
 * Inline CSS is NOT free-form. Every `style` declaration must match an entry
 * in the allowlist below, which covers exactly the declarations present in
 * real WordPress content (font-weight, font-size, margins, text-align,
 * text-decoration, color). Everything else — url(), background images,
 * position/fixed overlays, display, filters, transforms — is removed because
 * it either does not survive the regex match or is simply not in the map.
 */
// Value shape mirrors sanitize-html's `allowedStyles` option
// (`{ [tag]: { [cssProperty]: RegExp[] } }` in @types/sanitize-html).
const cssRules: Record<string, RegExp[]> = {
  'text-align': [/^(left|center|right|justify)$/i],
  color: [
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    /^rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:0(?:\.\d+)?|1(?:\.0+)?))?\s*\)$/i,
  ],
  'font-weight': [/^(?:normal|bold|bolder|lighter|inherit|[1-9]00)$/i],
  'font-size': [
    /^(?:inherit|xx-small|x-small|small|medium|large|x-large|xx-large)$/i,
    /^\d+(?:\.\d+)?(?:px|rem|em|pt|%)$/i,
  ],
  'text-decoration': [/^(?:none|underline|line-through|underline line-through|line-through underline)$/i],
  'text-decoration-line': [/^(?:none|underline|line-through|underline line-through|line-through underline)$/i],
  'margin-top': [/^(?:0|-\d+(?:\.\d+)?|\d+(?:\.\d+)?)(?:px|rem|em|%)?$/i],
  'margin-bottom': [/^(?:0|-\d+(?:\.\d+)?|\d+(?:\.\d+)?)(?:px|rem|em|%)?$/i],
  'list-style-type': [/^(?:none|disc|decimal|circle|square)$/i],
};

// `allowedStyles` is keyed by tag name; `*` applies to every element. A
// declaration that is absent here, or whose value fails its regex, is dropped
// — so url(), position, display and friends can never reach output.
const styleRules: Record<string, Record<string, RegExp[]>> = { '*': cssRules };

const options: sanitizeHtmlLib.IOptions = {
  allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat(['img']),
  allowedAttributes: {
    '*': ['class', 'id', 'title', 'dir', 'lang', 'style'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
    blockquote: ['cite'],
    col: ['span', 'width'],
    colgroup: ['span', 'width'],
    ol: ['start', 'type'],
    td: ['colspan', 'rowspan', 'headers'],
    th: ['colspan', 'rowspan', 'scope', 'headers'],
    time: ['datetime'],
  },
  allowedStyles: styleRules,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
  },
};

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, options);
}
