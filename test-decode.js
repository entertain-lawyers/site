function decodeHtmlEntities(str) {
  if (!str) return str;
  return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
            .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ');
}
console.log(decodeHtmlEntities('&#8220;Test&#8221; &amp; &#8230;'));
