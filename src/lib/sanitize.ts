import sanitizeHtmlLib from 'sanitize-html';

/**
 * Allowed markup is the same reading surface the old site used: headings,
 * paragraphs, lists, tables, quotes, images and links. Anything active
 * (script, iframe, style, event handlers) is dropped.
 *
 * DOMPurify was replaced because its server build needs jsdom, whose CJS
 * dependency chain cannot be loaded by the Turbopack server runtime on Vercel.
 * sanitize-html is pure JavaScript and behaves the same on server and client.
 */
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
