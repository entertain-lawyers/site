import { describe, it, expect, afterEach } from 'vitest';
import { getClientIp } from '@/lib/client-ip';

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

const originalVercel = process.env.VERCEL;
const originalNetlify = process.env.NETLIFY;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalNetlify === undefined) delete process.env.NETLIFY;
  else process.env.NETLIFY = originalNetlify;
});

describe('getClientIp', () => {
  it('uses the platform header on Vercel instead of a spoofed x-forwarded-for', () => {
    process.env.VERCEL = '1';
    const ip = getClientIp(
      headers({
        'x-real-ip': '203.0.113.9',
        'x-forwarded-for': '1.2.3.4, 203.0.113.9',
      })
    );
    expect(ip).toBe('203.0.113.9');
  });

  it('uses the Netlify header on Netlify', () => {
    process.env.NETLIFY = 'true';
    const ip = getClientIp(
      headers({ 'x-nf-client-connection-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4' })
    );
    expect(ip).toBe('198.51.100.7');
  });

  it('falls back to the last forwarded hop when no platform is known', () => {
    delete process.env.VERCEL;
    delete process.env.NETLIFY;
    expect(getClientIp(headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('10.0.0.1');
  });
});
