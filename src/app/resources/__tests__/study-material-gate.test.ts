import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Server-side sign-in gate for Law Notes, Case Laws and Old Questions.
 * The real page functions are called; `redirect`/`notFound` throw like they
 * do in Next, so a redirect means nothing after it ran.
 */

class RedirectSignal extends Error {
  constructor(public readonly url: string) { super(`NEXT_REDIRECT ${url}`); }
}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new RedirectSignal(url); }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

let session: { user: { id: string; email?: string; role?: string } } | null = null;
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => session) }));

const resourceRow = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Contract Law Unit 1',
  type: 'LAW_NOTE',
  status: 'PUBLISHED',
  isPremium: true,
  priceAmount: 5000,
  currency: 'NPR',
  subjectId: 's1',
  unitId: null,
  documentId: 'd1',
  document: { id: 'd1', storageKey: 'documents/secret.pdf' },
  content: '<p>SECRET NOTE BODY</p>',
  description: null,
  unit: null,
  subject: { id: 's1', name: 'Contract', semesterId: 'sem1', semester: { name: 'Sem 1' }, units: [] },
};
const findUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { resource: { findUnique: (...a: unknown[]) => findUnique(...a), findMany: vi.fn(async () => []) } },
}));

const canAccessResource = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false);
vi.mock('@/modules/entitlements/entitlement.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/entitlements/entitlement.service')>()),
  canAccessResource: (...a: unknown[]) => canAccessResource(...a),
}));

const getSecureDocumentUrl = vi.fn<(...args: unknown[]) => Promise<{ success: boolean; data: string }>>(
  async () => ({ success: true, data: 'https://signed.example/secret.pdf' })
);
vi.mock('@/modules/documents/document.actions', () => ({
  getSecureDocumentUrl: (...a: unknown[]) => getSecureDocumentUrl(...a),
}));

vi.mock('@/lib/i18n', () => ({ getDictionary: vi.fn(async () => new Proxy({}, { get: (_t, k) => String(k) })) }));
vi.mock('@/components/payments/CheckoutButtons', () => ({ CheckoutButtons: () => null }));
vi.mock('@/components/SecurePdfViewer', () => ({ default: () => null }));
vi.mock('@/components/study/StudyOutlineSidebar', () => ({ default: () => null }));
vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_APP_URL: 'https://example.test', PAYMENTS_ENABLED: 'false' } }));

import ResourcePage from '../[id]/page';
import ReadResourcePage from '../../read/[resourceId]/page';

const params = (id: string) => ({ params: Promise.resolve({ id, resourceId: id }) });

/** Every string in a React element tree (text and prop values). */
function textOf(node: unknown, seen = new Set<unknown>()): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node !== 'object' || seen.has(node)) return '';
  seen.add(node);
  if (Array.isArray(node)) return node.map((n) => textOf(n, seen)).join(' ');
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return '';
  return Object.values(props).map((v) => textOf(v, seen)).join(' ');
}

async function redirectOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
}

describe('study material sign-in gate (server-side)', () => {
  beforeEach(() => {
    session = null;
    findUnique.mockReset();
    canAccessResource.mockReset().mockResolvedValue(false);
    getSecureDocumentUrl.mockClear();
  });

  it.each(['LAW_NOTE', 'CASE_LAW', 'OLD_QUESTION'])(
    'redirects an anonymous visitor opening a %s to login and back to it',
    async (type) => {
      findUnique.mockResolvedValue({ ...resourceRow, type });

      const url = await redirectOf(() => ResourcePage(params(resourceRow.id)));

      expect(url).not.toBeNull();
      const parsed = new URL(url!, 'http://x');
      expect(parsed.pathname).toBe('/login');
      expect(parsed.searchParams.get('callbackUrl')).toBe(`/resources/${resourceRow.id}`);
      expect(parsed.searchParams.get('reason')).toBe('study-material');
      expect(canAccessResource).not.toHaveBeenCalled();
    }
  );

  it('keeps OTHER resources viewable without signing in', async () => {
    findUnique.mockResolvedValue({ ...resourceRow, type: 'OTHER', isPremium: false });
    expect(await redirectOf(() => ResourcePage(params(resourceRow.id)))).toBeNull();
  });

  it('serves the page to a signed-in user without a login redirect', async () => {
    session = { user: { id: 'u1', role: 'USER' } };
    findUnique.mockResolvedValue(resourceRow);
    expect(await redirectOf(() => ResourcePage(params(resourceRow.id)))).toBeNull();
    expect(canAccessResource).toHaveBeenCalledWith('u1', resourceRow.id);
  });

  it('never loads or signs a document for an anonymous reader', async () => {
    findUnique.mockResolvedValue(resourceRow);

    const url = await redirectOf(() => ReadResourcePage(params(resourceRow.id)));

    const parsed = new URL(url!, 'http://x');
    expect(parsed.searchParams.get('callbackUrl')).toBe(`/read/${resourceRow.id}`);
    expect(parsed.searchParams.get('reason')).toBe('study-material');
    expect(findUnique).not.toHaveBeenCalled();
    expect(getSecureDocumentUrl).not.toHaveBeenCalled();
  });

  it('a signed-in user without purchase/entitlement gets no signed URL or note body', async () => {
    session = { user: { id: 'u1', email: 'u1@example.test' } };
    findUnique.mockResolvedValue(resourceRow);
    canAccessResource.mockResolvedValue(false);

    const tree = await ReadResourcePage(params(resourceRow.id));

    expect(getSecureDocumentUrl).not.toHaveBeenCalled();
    const rendered = textOf(tree);
    expect(rendered).not.toContain('SECRET NOTE BODY');
    expect(rendered).not.toContain('signed.example');
    expect(rendered).toContain('accessDenied');
  });

  it('written notes: the body is rendered only for an entitled user', async () => {
    session = { user: { id: 'u1', email: 'u1@example.test' } };
    findUnique.mockResolvedValue({ ...resourceRow, documentId: null, document: null });

    canAccessResource.mockResolvedValue(false);
    expect(textOf(await ReadResourcePage(params(resourceRow.id)))).not.toContain('SECRET NOTE BODY');

    canAccessResource.mockResolvedValue(true);
    expect(textOf(await ReadResourcePage(params(resourceRow.id)))).toContain('SECRET NOTE BODY');
  });

  it('an entitled user gets the signed document URL', async () => {
    session = { user: { id: 'u1', email: 'u1@example.test' } };
    findUnique.mockResolvedValue(resourceRow);
    canAccessResource.mockResolvedValue(true);

    await ReadResourcePage(params(resourceRow.id));

    expect(getSecureDocumentUrl).toHaveBeenCalledWith({ resourceId: resourceRow.id });
  });
});
