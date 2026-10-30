import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '@/lib/seo';

describe('serializeJsonLd', () => {
  it('keeps normal structured data as valid JSON', () => {
    const value = { '@type': 'BreadcrumbList', name: 'Study & Notes' };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it('cannot break out of the inline script tag', () => {
    const payload = { name: '</script><script>alert(1)</script>' };
    const serialized = serializeJsonLd(payload);

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(JSON.parse(serialized).name).toBe(payload.name);
  });

  it('escapes line/paragraph separators that are invalid in inline JS', () => {
    const serialized = serializeJsonLd({ name: 'a\u2028b\u2029c' });
    expect(serialized).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(serialized).name).toBe('a\u2028b\u2029c');
  });
});
