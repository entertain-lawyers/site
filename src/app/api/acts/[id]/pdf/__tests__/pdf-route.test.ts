import { describe, it, expect } from 'vitest';
import { isFetchableUrl } from '../route';

describe('act PDF proxy SSRF guard', () => {
  it('allows public http(s) URLs', () => {
    expect(isFetchableUrl(new URL('https://lawcommission.gov.np/en/doc.pdf'))).toBe(true);
    expect(isFetchableUrl(new URL('http://example.com/doc.pdf'))).toBe(true);
  });

  it('rejects non-http protocols and internal hosts', () => {
    expect(isFetchableUrl(new URL('ftp://example.com/doc.pdf'))).toBe(false);
    expect(isFetchableUrl(new URL('file:///etc/passwd'))).toBe(false);
    expect(isFetchableUrl(new URL('http://localhost/doc.pdf'))).toBe(false);
    expect(isFetchableUrl(new URL('http://db.internal/doc.pdf'))).toBe(false);
    expect(isFetchableUrl(new URL('http://169.254.169.254/latest/meta-data'))).toBe(false);
    expect(isFetchableUrl(new URL('http://10.0.0.5/doc.pdf'))).toBe(false);
    expect(isFetchableUrl(new URL('http://192.168.1.1/doc.pdf'))).toBe(false);
  });
});
