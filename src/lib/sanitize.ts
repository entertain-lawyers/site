import sanitizeHtmlLib from 'sanitize-html';
import { unwrapEmptyListWrappers } from './editor-html';

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
  // 3/6-digit hex only (no alpha channel) and rgb(a) with a non-zero alpha,
  // so `#0000`, `#00000000`, `rgba(0,0,0,0)` and `transparent` cannot make
  // text invisible.
  color: [
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i,
    /^rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)$/i,
  ],
  // The editor's highlight button; same safe colour forms as `color`.
  'background-color': [
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i,
    /^rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)$/i,
  ],
  'font-weight': [/^(?:normal|bold|bolder|lighter|inherit|[1-9]00)$/i],
  // Bounded so a post cannot blow up the layout: 1-72px, 0.1-5rem/em,
  // 1-54pt, 1-300%.
  'font-size': [
    /^(?:inherit|xx-small|x-small|small|medium|large|x-large|xx-large)$/i,
    /^(?:[1-9]|[1-6]\d|7[0-2])px$/i,
    /^(?:0?\.[1-9]\d*|[1-4](?:\.\d+)?|5(?:\.0+)?)(?:rem|em)$/i,
    /^(?:[1-9]|[1-4]\d|5[0-4])pt$/i,
    /^(?:[1-9]|[1-9]\d|[12]\d\d|300)%$/i,
  ],
  'text-decoration': [/^(?:none|underline|line-through|underline line-through|line-through underline)$/i],
  'text-decoration-line': [/^(?:none|underline|line-through|underline line-through|line-through underline)$/i],
  // Bounded: ±200px, ±10rem/em, ±100%.
  'margin-top': [
    /^(?:-?0|0px|-?(?:[1-9]\d?|1\d\d|200)px)$/i,
    /^(?:-?0|0(?:rem|em)|-?(?:[1-9](?:\.\d+)?|10(?:\.0+)?)(?:rem|em))$/i,
    /^(?:-?0|0%|-?(?:[1-9]\d?|100)%)$/i,
  ],
  'margin-bottom': [
    /^(?:-?0|0px|-?(?:[1-9]\d?|1\d\d|200)px)$/i,
    /^(?:-?0|0(?:rem|em)|-?(?:[1-9](?:\.\d+)?|10(?:\.0+)?)(?:rem|em))$/i,
    /^(?:-?0|0%|-?(?:[1-9]\d?|100)%)$/i,
  ],
  'list-style-type': [/^(?:none|disc|decimal|circle|square|lower-roman|upper-roman|lower-alpha|upper-alpha)$/i],
  // Bounded line spacing: unitless 0.8-3, percentage 80-300%, 0.8-3rem/em, 12-72px, or normal.
  'line-height': [
    /^(?:normal|(?:0\.[8-9]\d*|[1-2](?:\.\d+)?|3(?:\.0+)?)|(?:[89]\d|1[0-9]{2}|200|300)%|(?:0\.[8-9]\d*|[1-2](?:\.\d+)?|3(?:\.0+)?)(?:rem|em)|(?:1[2-9]|[2-6]\d|7[0-2])px)$/i,
  ],
  width: [/^(?:auto|0|0px|[1-9]\d{0,3}px|[1-9]\d?%|100%)$/i],
  'max-width': [/^(?:none|0|0px|[1-9]\d{0,3}px|[1-9]\d?%|100%)$/i],
  'min-width': [/^(?:0|0px|[1-9]\d{0,3}px)$/i],
  height: [/^(?:auto|0|0px|[1-9]\d{0,3}px|[1-9]\d?%|100%)$/i],
  'min-height': [/^(?:0|0px|[1-9]\d{0,3}px)$/i],
  'vertical-align': [/^(?:top|middle|bottom|baseline|sub|super|text-top|text-bottom)$/i],
  padding: [/^(?:0|0px|[1-9]\d?px)(?:\s+(?:0|0px|[1-9]\d?px)){0,3}$/i],
  'padding-top': [/^(?:0|0px|[1-9]\d?px|0?\.[1-9]\d*rem|1rem|1\.5rem)$/i],
  'padding-bottom': [/^(?:0|0px|[1-9]\d?px|0?\.[1-9]\d*rem|1rem|1\.5rem)$/i],
  'padding-left': [/^(?:0|0px|[1-9]\d?px|0?\.[1-9]\d*rem|1rem|1\.5rem)$/i],
  'padding-right': [/^(?:0|0px|[1-9]\d?px|0?\.[1-9]\d*rem|1rem|1\.5rem)$/i],
  'margin-left': [/^(?:auto|0|0px|-?(?:[1-9]\d?|1\d\d|200)px|-?(?:[1-9](?:\.\d+)?|10(?:\.0+)?)(?:rem|em)|-?(?:[1-9]\d?|100)%)$/i],
  'margin-right': [/^(?:auto|0|0px|-?(?:[1-9]\d?|1\d\d|200)px|-?(?:[1-9](?:\.\d+)?|10(?:\.0+)?)(?:rem|em)|-?(?:[1-9]\d?|100)%)$/i],
  'border-collapse': [/^(?:collapse|separate)$/i],
  'border-spacing': [/^(?:0|0px|[1-9]\d?px)$/i],
  border: [
    /^(?:none|0|0px|(?:(?:0|[1-9]\d?px)\s+(?:solid|dashed|dotted|double|none)(?:\s+(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)|transparent))?))$/i,
  ],
  'border-top': [
    /^(?:none|0|0px|(?:(?:0|[1-9]\d?px)\s+(?:solid|dashed|dotted|double|none)(?:\s+(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)|transparent))?))$/i,
  ],
  'border-bottom': [
    /^(?:none|0|0px|(?:(?:0|[1-9]\d?px)\s+(?:solid|dashed|dotted|double|none)(?:\s+(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)|transparent))?))$/i,
  ],
  'border-left': [
    /^(?:none|0|0px|(?:(?:0|[1-9]\d?px)\s+(?:solid|dashed|dotted|double|none)(?:\s+(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)|transparent))?))$/i,
  ],
  'border-right': [
    /^(?:none|0|0px|(?:(?:0|[1-9]\d?px)\s+(?:solid|dashed|dotted|double|none)(?:\s+(?:#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)|transparent))?))$/i,
  ],
  'border-width': [/^(?:0|0px|[1-9]\d?px|thin|medium|thick)$/i],
  'border-style': [/^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i],
  'border-color': [
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i,
    /^rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:1(?:\.0+)?|0?\.\d*[1-9]\d*))?\s*\)$/i,
    /^transparent$/i,
  ],
  'caption-side': [/^(?:top|bottom)$/i],
};

// `allowedStyles` is keyed by tag name; `*` applies to every element. A
// declaration that is absent here, or whose value fails its regex, is dropped
// — so url(), position, display and friends can never reach output.
const styleRules: Record<string, Record<string, RegExp[]>> = { '*': cssRules };

const options: sanitizeHtmlLib.IOptions = {
  // iframe is only for the editor's video button; see allowedIframeHostnames.
  allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat(['img', 'iframe', 'col', 'colgroup', 'caption']),
  allowedAttributes: {
    '*': ['class', 'id', 'title', 'dir', 'lang', 'style'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'title', 'loading'],
    blockquote: ['cite'],
    col: ['span', 'width', 'style', 'class'],
    colgroup: ['span', 'width', 'style', 'class'],
    ol: ['start', 'type'],
    table: ['class', 'id', 'style', 'width', 'border', 'cellpadding', 'cellspacing', 'align', 'data-table-align', 'data-table-preset', 'data-table-width'],
    caption: ['class', 'id', 'style', 'align'],
    tbody: ['class', 'id', 'style'],
    thead: ['class', 'id', 'style'],
    tfoot: ['class', 'id', 'style'],
    tr: ['data-row', 'class', 'id', 'style', 'align', 'valign'],
    td: ['colspan', 'rowspan', 'headers', 'data-row', 'class', 'id', 'style', 'width', 'height', 'align', 'valign'],
    th: ['colspan', 'rowspan', 'scope', 'headers', 'data-row', 'class', 'id', 'style', 'width', 'height', 'align', 'valign'],
    time: ['datetime'],
  },
  allowedStyles: styleRules,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'], iframe: ['https'] },
  // Video embeds from the editor; any other iframe is removed.
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
  allowIframeRelativeUrls: false,
  // An iframe whose src was rejected would render as an empty box; drop it.
  exclusiveFilter: (frame) => frame.tag === 'iframe' && !frame.attribs.src,
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
  },
};

/**
 * Strips accidental white/near-white background colors and hardcoded dark text
 * colors from pasted content (e.g. from Word, Google Docs, or web pages).
 * In dark mode or on cards, these inline styles create unwanted white highlight
 * blocks behind text. True highlights (e.g. yellow, green, orange markers) are
 * preserved.
 */
export function cleanPastedInlineStyles(html: string): string {
  if (!html) return html;
  const out = html.replace(/style=["']([^"']*)["']/gi, (match, styleContent) => {
    const hasWhiteBg = /background-color:\s*(?:#fff(?:fff)?|rgba?\(\s*25[0-5]\s*,\s*25[0-5]\s*,\s*25[0-5](?:\s*,\s*(?:1|0?\.\d+))?\s*\)|white)(?:;|$|\s)/i.test(styleContent);
    if (!hasWhiteBg) return match;

    let updated = styleContent.replace(/background-color:\s*(?:#fff(?:fff)?|rgba?\(\s*25[0-5]\s*,\s*25[0-5]\s*,\s*25[0-5](?:\s*,\s*(?:1|0?\.\d+))?\s*\)|white)\s*;?/gi, '');
    // If accompanied by hardcoded dark text color (rgb(17,17,17), rgb(0,0,0), #000, #111), strip it so text inherits the theme color
    updated = updated.replace(/color:\s*(?:#000(?:000)?|#111(?:111)?|rgba?\(\s*(?:0|1[0-7])\s*,\s*(?:0|1[0-7])\s*,\s*(?:0|1[0-7])(?:\s*,\s*1)?\s*\)|black)\s*;?/gi, '');

    updated = updated.trim().replace(/^;|;$/g, '').trim();
    return updated ? `style="${updated}"` : '';
  });

  return out.replace(/<([a-z0-9]+)\s+>/gi, '<$1>').replace(/\s*style=["']\s*["']/gi, '');
}

/**
 * Wraps any bare <table> in a responsive scroll container (<div class="table-container">)
 * so broad tables scroll horizontally on mobile viewports instead of breaking the layout
 * or degrading into block layout.
 */
export function wrapTablesResponsively(html: string): string {
  if (!html || !html.includes('<table')) return html;
  return html.replace(
    /(<div\s+[^>]*class=["'][^"']*table-container[^"']*["'][^>]*>\s*)?(<table[\s\S]*?<\/table>)(\s*<\/div>)?/gi,
    (match, prefix, table, suffix) => {
      if (!prefix && suffix) {
        return `<div class="table-container">${table}</div>${suffix}`;
      }
      return `<div class="table-container">${table}</div>`;
    }
  );
}

export function sanitizeHtml(html: string): string {
  const unwrapped = unwrapEmptyListWrappers(html);
  const sanitized = sanitizeHtmlLib(unwrapped, options);
  const cleaned = cleanPastedInlineStyles(sanitized);
  return wrapTablesResponsively(cleaned);
}
