import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize editor or WordPress HTML before rendering it. Allows normal article
 * markup (headings, lists, links, images, tables) and strips scripts, event
 * handlers, iframes and other active content.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}
