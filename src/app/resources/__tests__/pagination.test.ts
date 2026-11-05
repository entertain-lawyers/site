import { describe, it, expect } from 'vitest';
import { parseResourcePage, MAX_SAFE_RESOURCE_PAGE } from '../pagination';

describe('Resource Pagination Input Validation', () => {
  it('parses normal valid page numbers', () => {
    expect(parseResourcePage('1')).toBe(1);
    expect(parseResourcePage('2')).toBe(2);
    expect(parseResourcePage('10')).toBe(10);
    expect(parseResourcePage('999')).toBe(999);
  });

  it('defaults to page 1 when parameter is undefined or empty', () => {
    expect(parseResourcePage(undefined)).toBe(1);
    expect(parseResourcePage('')).toBe(1);
  });

  it('rejects negative numbers and zero', () => {
    expect(parseResourcePage('0')).toBeNull();
    expect(parseResourcePage('-1')).toBeNull();
    expect(parseResourcePage('-50')).toBeNull();
  });

  it('rejects decimal numbers', () => {
    expect(parseResourcePage('1.5')).toBeNull();
    expect(parseResourcePage('2.0')).toBeNull();
    expect(parseResourcePage('0.1')).toBeNull();
    expect(parseResourcePage('1,5')).toBeNull();
  });

  it('rejects malformed and non-numeric inputs', () => {
    expect(parseResourcePage('abc')).toBeNull();
    expect(parseResourcePage('1a')).toBeNull();
    expect(parseResourcePage('page-2')).toBeNull();
    expect(parseResourcePage('null')).toBeNull();
    expect(parseResourcePage('NaN')).toBeNull();
    expect(parseResourcePage('undefined')).toBeNull();
    expect(parseResourcePage(' 1 ')).toBeNull();
    expect(parseResourcePage('+1')).toBeNull();
  });

  it('rejects extremely large numbers beyond JavaScript safe integer range', () => {
    expect(parseResourcePage('9999999999999999999')).toBeNull();
    expect(parseResourcePage('9007199254740993')).toBeNull(); // MAX_SAFE_INTEGER + 2
    expect(parseResourcePage('9007199254740992')).toBeNull(); // MAX_SAFE_INTEGER + 1
  });

  it('rejects out-of-range inputs exceeding database 32-bit offset limits', () => {
    expect(parseResourcePage('50000000')).toBeNull();
    expect(parseResourcePage(String(MAX_SAFE_RESOURCE_PAGE + 1))).toBeNull();
  });

  it('accepts the maximum safe page boundary', () => {
    expect(parseResourcePage(String(MAX_SAFE_RESOURCE_PAGE))).toBe(MAX_SAFE_RESOURCE_PAGE);
  });
});
