/**
 * Convert editor HTML to readable plain text.
 *
 * Notes are authored in a rich-text editor, but rendering raw HTML would need a
 * full sanitizer (and the CSP allows inline scripts). Converting to text keeps
 * the body readable while making injection impossible: React escapes the
 * resulting string when it renders it.
 */
export function htmlToText(html: string): string {
  return html
    // Drop script/style bodies entirely; their text is not content.
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote|\/tr|\/ul|\/ol)\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
