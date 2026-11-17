import { describe, it, expect, afterEach } from 'vitest';
import { buildCsp } from '@/lib/csp';

/**
 * The CSP used to be a static next.config.ts header with 'unsafe-inline' in
 * script-src. It is now a per-request nonce policy generated in src/proxy.ts
 * via buildCsp(); these tests verify the same guarantees on the new source.
 */
describe('CSP Upload Policy & Storage Connection', () => {
  const originalEnv = process.env.B2_ENDPOINT;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.B2_ENDPOINT = originalEnv;
    } else {
      delete process.env.B2_ENDPOINT;
    }
  });

  it('explicitly defines connect-src directive to prevent fallback to default-src', () => {
    delete process.env.B2_ENDPOINT;
    const cspHeader = buildCsp();

    expect(cspHeader).toContain("connect-src 'self'");
    expect(cspHeader).toContain("default-src 'self'");
  });

  it('includes the exact B2 origin in connect-src and img-src when B2_ENDPOINT is configured', () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    const cspHeader = buildCsp();

    expect(cspHeader).toContain("connect-src 'self' https://s3.us-east-005.backblazeb2.com");
    // img-src contains both the CMS host and the B2 origin (spacing may vary due to join)
    expect(cspHeader).toContain("img-src");
    expect(cspHeader).toContain("https://cms.entertainlawyers.com");
    expect(cspHeader).toContain("https://s3.us-east-005.backblazeb2.com");
  });

  it('does not include broad wildcard *.backblazeb2.com in connect-src or img-src', () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    const cspHeader = buildCsp();

    expect(cspHeader).not.toContain('*.backblazeb2.com');
  });

  it('preserves existing security directives (object-src none, frame-ancestors none)', () => {
    const cspHeader = buildCsp();

    expect(cspHeader).toContain("object-src 'none'");
    expect(cspHeader).toContain("frame-ancestors 'none'");
    expect(cspHeader).toContain("base-uri 'self'");
  });

  it('rejects non-HTTPS protocols (http://, javascript:, data:)', () => {
    process.env.B2_ENDPOINT = 'http://s3.us-east-005.backblazeb2.com';
    let cspHeader = buildCsp();
    expect(cspHeader).not.toContain('http://');

    process.env.B2_ENDPOINT = 'javascript:alert(1)';
    cspHeader = buildCsp();
    expect(cspHeader).not.toContain('javascript');

    process.env.B2_ENDPOINT = 'data:text/html,<h1>test</h1>';
    cspHeader = buildCsp();
    expect(cspHeader).not.toContain('data:text');
  });

  it('rejects malformed URLs or potential CSP injection attempts', () => {
    process.env.B2_ENDPOINT = 'https://attacker.com; script-src *';
    let cspHeader = buildCsp();
    expect(cspHeader).not.toContain('script-src *');
    expect(cspHeader).not.toContain('attacker.com');

    process.env.B2_ENDPOINT = 'not a valid url';
    cspHeader = buildCsp();
    expect(cspHeader).toContain("connect-src 'self'");
    expect(cspHeader).not.toContain('not a valid url');
  });

  it('extracts only the exact HTTPS origin even if path or query params are provided in B2_ENDPOINT', () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com/bucket-name/folder?key=secret';
    const cspHeader = buildCsp();
    expect(cspHeader).toContain("connect-src 'self' https://s3.us-east-005.backblazeb2.com");
    expect(cspHeader).not.toContain('bucket-name');
    expect(cspHeader).not.toContain('secret');
  });

  it('nonce mode never falls back to unsafe-inline for scripts', () => {
    const cspHeader = buildCsp('test-nonce');
    expect(cspHeader).toContain("'nonce-test-nonce'");
    // style-src legitimately keeps 'unsafe-inline'; script-src must not.
    const scriptSrc = cspHeader.split(';').find((d) => d.trim().startsWith('script-src'))!;
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  it('permits eSewa production and sandbox origins in form-action while blocking arbitrary origins', () => {
    const cspHeader = buildCsp();
    const formActionDirective = cspHeader
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('form-action'));

    expect(formActionDirective).toBeDefined();
    expect(formActionDirective).toBe(
      "form-action 'self' https://epay.esewa.com.np https://rc-epay.esewa.com.np"
    );
    expect(formActionDirective).not.toContain('*');
    expect(formActionDirective).not.toContain('https://attacker.com');
  });
});
