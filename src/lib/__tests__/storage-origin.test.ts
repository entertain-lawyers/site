import { describe, expect, it } from 'vitest';
import { storageOriginForCsp } from '@/lib/storage-origin';

describe('storageOriginForCsp', () => {
  it('allows the local http mock storage in development (regression: uploads were CSP-blocked)', () => {
    expect(storageOriginForCsp('http://localhost:9000', true)).toBe('http://localhost:9000');
    expect(storageOriginForCsp('http://127.0.0.1:9000/', true)).toBe('http://127.0.0.1:9000');
    expect(storageOriginForCsp('http://[::1]:9000', true)).toBe('http://[::1]:9000');
  });

  it('never allows plain http in production or for non-loopback hosts', () => {
    expect(storageOriginForCsp('http://localhost:9000', false)).toBe('');
    expect(storageOriginForCsp('http://s3.example.com', true)).toBe('');
  });

  it('allows https endpoints in every environment', () => {
    expect(storageOriginForCsp('https://s3.us-east-005.backblazeb2.com', false)).toBe('https://s3.us-east-005.backblazeb2.com');
    expect(storageOriginForCsp('https://s3.us-east-005.backblazeb2.com/bucket', true)).toBe('https://s3.us-east-005.backblazeb2.com');
  });

  it('ignores missing, malformed or non-http endpoints', () => {
    expect(storageOriginForCsp(undefined, true)).toBe('');
    expect(storageOriginForCsp('not a url', true)).toBe('');
    expect(storageOriginForCsp('ftp://localhost:9000', true)).toBe('');
  });
});
