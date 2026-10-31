import { describe, expect, it } from 'vitest';
import { safeCallbackUrl, studyMaterialLoginUrl } from '@/lib/callback-url';

describe('safeCallbackUrl', () => {
  it('keeps same-site paths with their query and hash', () => {
    expect(safeCallbackUrl('/resources/abc')).toBe('/resources/abc');
    expect(safeCallbackUrl('/study?type=LAW_NOTE&subject=1#unit')).toBe('/study?type=LAW_NOTE&subject=1#unit');
  });

  it('rejects other origins and redirect tricks (no open redirect)', () => {
    for (const bad of [
      'https://evil.example/x',
      '//evil.example/x',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      '/\t/evil.example',
      ' //evil.example',
      'evil.example',
      '',
      null,
      undefined,
      `/${'a'.repeat(3000)}`,
    ]) {
      expect(safeCallbackUrl(bad as string)).toBe('/dashboard');
    }
  });

  it('never sends the user back to the auth pages', () => {
    expect(safeCallbackUrl('/login?callbackUrl=/x')).toBe('/dashboard');
    expect(safeCallbackUrl('/api/auth/signout')).toBe('/dashboard');
    expect(safeCallbackUrl('/register')).toBe('/dashboard');
    expect(safeCallbackUrl('/loginx')).toBe('/loginx');
  });

  it('uses the given fallback', () => {
    expect(safeCallbackUrl('https://evil.example', '/resources/1')).toBe('/resources/1');
  });
});

describe('studyMaterialLoginUrl', () => {
  it('encodes the destination and the reason', () => {
    const url = new URL(studyMaterialLoginUrl('/read/abc?page=2'), 'http://x');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('callbackUrl')).toBe('/read/abc?page=2');
    expect(url.searchParams.get('reason')).toBe('study-material');
  });
});
