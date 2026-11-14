/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock entitlement
vi.mock('@/modules/entitlements/entitlement.service', () => ({
  canAccessResource: vi.fn().mockResolvedValue(true),
  requiresSignIn: vi.fn().mockReturnValue(false),
}));

// Mock seo
vi.mock('@/lib/seo', () => ({
  serializeJsonLd: vi.fn().mockReturnValue('{}'),
  getSiteUrl: vi.fn().mockReturnValue('https://entertainlawyers.com'),
}));

// Mock i18n & components
vi.mock('@/lib/i18n', () => ({
  getDictionary: vi.fn(async () => ({
    goBack: 'Go Back',
    home: 'Home',
    catLawNotes: 'Law Notes',
    catCaseLaws: 'Case Laws',
    catOldQuestions: 'Old Questions',
    catHistoricalFacts: 'Other',
    author: 'Author',
    semester: 'Semester',
    subject: 'Subject',
    unit: 'Unit',
    free: 'FREE',
    premium: 'PREMIUM',
  })),
}));
vi.mock('@/components/payments/CheckoutButtons', () => ({ CheckoutButtons: () => null }));
vi.mock('@/components/SecurePdfViewer', () => ({ default: () => null }));
vi.mock('@/components/study/StudyOutlineSidebar', () => ({ default: () => null }));
vi.mock('@/components/posts/ArticleBody', () => ({ default: () => null }));
vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_APP_URL: 'https://example.test', PAYMENTS_ENABLED: 'false' } }));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    resource: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));
import { prisma } from '@/lib/prisma';

import ReadResourcePage from '../[resourceId]/page';
import ResourcePage from '../../resources/[id]/page';

function findHrefs(node: any, hrefs: string[] = []): string[] {
  if (!node || typeof node !== 'object') return hrefs;
  if (node.props?.href) hrefs.push(String(node.props.href));
  if (Array.isArray(node.props?.children)) {
    node.props.children.forEach((child: any) => findHrefs(child, hrefs));
  } else if (node.props?.children) {
    findHrefs(node.props.children, hrefs);
  }
  return hrefs;
}

describe('Reader and Resource navigation & breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
  });

  it('renders correct back URL and clean breadcrumbs for OLD_QUESTION with semester and no subject', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'oq-1',
      title: '1st Semester Old Questions 2026',
      status: 'PUBLISHED',
      type: 'OLD_QUESTION',
      semesterId: 'sem-1st',
      semester: { id: 'sem-1st', name: '1st Semester', order: 1 },
      subjectId: null,
      subject: null,
      unitId: null,
      unit: null,
      documentId: 'doc-1',
      document: { id: 'doc-1' },
      content: null,
      featuredImage: null,
      author: null,
      createdBy: null,
    });

    const vdom = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'oq-1' }),
    });

    expect(vdom).toBeDefined();

    const hrefs = findHrefs(vdom);
    expect(hrefs).toContain('/study?type=OLD_QUESTION&semester=sem-1st');
    expect(hrefs.some((h) => h.includes('undefined'))).toBe(false);
  });

  it('renders correct back URL for LAW_NOTE with semester, subject, and unit', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'note-1',
      title: 'Constitutional Law Unit 1 Notes',
      status: 'PUBLISHED',
      type: 'LAW_NOTE',
      semesterId: null,
      semester: null,
      subjectId: 'sub-con-law',
      subject: {
        id: 'sub-con-law',
        name: 'Constitutional Law',
        semester: { id: 'sem-2nd', name: '2nd Semester' },
        units: [],
      },
      unitId: 'unit-1',
      unit: { id: 'unit-1', name: 'Unit 1' },
      documentId: 'doc-2',
      document: { id: 'doc-2' },
      content: null,
      featuredImage: null,
      author: null,
      createdBy: null,
    });

    const vdom = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'note-1' }),
    });

    const hrefs = findHrefs(vdom);
    expect(hrefs).toContain('/study?type=LAW_NOTE&semester=sem-2nd&subject=sub-con-law&unit=unit-1');
  });

  it('ResourcePage detail view renders valid semester link and omits null subject for OLD_QUESTION', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'oq-detail-1',
      title: '1st Semester Old Questions Detail',
      status: 'PUBLISHED',
      type: 'OLD_QUESTION',
      semesterId: 'sem-1st',
      semester: { id: 'sem-1st', name: '1st Semester', order: 1 },
      subjectId: null,
      subject: null,
      unitId: null,
      unit: null,
      isPremium: false,
      priceAmount: null,
      currency: 'NPR',
      documentId: null, // detail view (e.g. no document yet)
      content: '',
      featuredImage: null,
      author: null,
      createdBy: null,
    });

    const vdom = await ResourcePage({
      params: Promise.resolve({ id: 'oq-detail-1' }),
    });

    const hrefs = findHrefs(vdom);
    expect(hrefs).toContain('/study?type=OLD_QUESTION&semester=sem-1st');
    expect(hrefs.some((h) => h.includes('undefined'))).toBe(false);
    expect(hrefs.some((h) => h.includes('subject=null'))).toBe(false);
  });
});
