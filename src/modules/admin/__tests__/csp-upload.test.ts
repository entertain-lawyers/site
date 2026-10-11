import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nextConfig from '../../../../next.config';

describe('CSP Upload Policy & Storage Connection', () => {
  const originalEnv = process.env.B2_ENDPOINT;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.B2_ENDPOINT = originalEnv;
    } else {
      delete process.env.B2_ENDPOINT;
    }
  });

  it('explicitly defines connect-src directive to prevent fallback to default-src', async () => {
    delete process.env.B2_ENDPOINT;
    const headers = await (nextConfig as any).headers();
    const cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;

    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("connect-src 'self'");
    expect(cspHeader).toContain("default-src 'self'");
  });

  it('includes the exact B2 origin in connect-src and img-src when B2_ENDPOINT is configured', async () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    const headers = await (nextConfig as any).headers();
    const cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;

    expect(cspHeader).toContain("connect-src 'self' https://s3.us-east-005.backblazeb2.com");
    expect(cspHeader).toContain("img-src 'self' blob: data: https://s3.us-east-005.backblazeb2.com");
  });

  it('does not include broad wildcard *.backblazeb2.com in connect-src or img-src', async () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    const headers = await (nextConfig as any).headers();
    const cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;

    expect(cspHeader).not.toContain('*.backblazeb2.com');
  });

  it('preserves existing security directives (object-src none, frame-ancestors none)', async () => {
    const headers = await (nextConfig as any).headers();
    const cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;

    expect(cspHeader).toContain("object-src 'none'");
    expect(cspHeader).toContain("frame-ancestors 'none'");
    expect(cspHeader).toContain("base-uri 'self'");
  });

  it('rejects non-HTTPS protocols (http://, javascript:, data:)', async () => {
    process.env.B2_ENDPOINT = 'http://s3.us-east-005.backblazeb2.com';
    let headers = await (nextConfig as any).headers();
    let cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;
    expect(cspHeader).not.toContain('http://');

    process.env.B2_ENDPOINT = 'javascript:alert(1)';
    headers = await (nextConfig as any).headers();
    cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;
    expect(cspHeader).not.toContain('javascript');

    process.env.B2_ENDPOINT = 'data:text/html,<h1>test</h1>';
    headers = await (nextConfig as any).headers();
    cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;
    expect(cspHeader).not.toContain('data:text');
  });

  it('rejects malformed URLs or potential CSP injection attempts', async () => {
    process.env.B2_ENDPOINT = 'https://attacker.com; script-src *';
    let headers = await (nextConfig as any).headers();
    let cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;
    expect(cspHeader).not.toContain('script-src *');
    expect(cspHeader).not.toContain('attacker.com');

    process.env.B2_ENDPOINT = 'not a valid url';
    headers = await (nextConfig as any).headers();
    cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;
    expect(cspHeader).toContain("connect-src 'self';");
  });

  it('extracts only the exact HTTPS origin even if path or query params are provided in B2_ENDPOINT', async () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com/bucket-name/folder?key=secret';
    const headers = await (nextConfig as any).headers();
    const cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value;
    expect(cspHeader).toContain("connect-src 'self' https://s3.us-east-005.backblazeb2.com;");
    expect(cspHeader).not.toContain('bucket-name');
    expect(cspHeader).not.toContain('secret');
  });
});
