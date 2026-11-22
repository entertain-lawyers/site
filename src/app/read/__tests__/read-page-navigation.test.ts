/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

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
vi.mock('@/components/study/StudyOutlineSidebar', () => ({ default: () => React.createElement('div', { 'data-testid': 'study-outline-sidebar' }) }));
vi.mock('@/components/study/StudyCurriculumSidebar', () => ({ default: () => React.createElement('div', { 'data-testid': 'study-curriculum-sidebar' }) }));
vi.mock('@/components/study/LatestCaseLawsSidebar', () => ({ default: () => React.createElement('div', { 'data-testid': 'latest-case-laws-sidebar' }) }));
vi.mock('@/components/posts/LatestPostsSidebar', () => ({ default: ({ title }: any) => React.createElement('div', { 'data-testid': 'latest-posts-sidebar' }, title) }));
vi.mock('@/components/posts/ArticleBody', () => ({ default: () => null }));
vi.mock('@/lib/latest-posts', () => ({
  getLatestPosts: vi.fn().mockResolvedValue([]),
  getLatestNewsPosts: vi.fn().mockResolvedValue([
    {
      id: 'news-1',
      title: 'Supreme Court bench formation update',
      type: 'NEWS',
      createdAt: new Date('2026-01-01'),
      url: '/news/news-1',
    },
  ]),
}));
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
import StudyOutlineSidebar from '@/components/study/StudyOutlineSidebar';
import StudyCurriculumSidebar from '@/components/study/StudyCurriculumSidebar';
import LatestCaseLawsSidebar from '@/components/study/LatestCaseLawsSidebar';
import LatestPostsSidebar from '@/components/posts/LatestPostsSidebar';

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

function hasComponent(node: any, component: any): boolean {
  if (!node || typeof node !== 'object') return false;
  if (node.type === component) return true;
  if (Array.isArray(node.props?.children)) {
    return node.props.children.some((child: any) => hasComponent(child, component));
  }
  if (node.props?.children) {
    return hasComponent(node.props.children, component);
  }
  return false;
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

  it('renders LatestCaseLawsSidebar and LatestPostsSidebar, and omits StudyCurriculumSidebar for prescribed cases in note reading view', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'case-1',
      title: 'Kesavananda Bharati v. State of Kerala',
      status: 'PUBLISHED',
      type: 'CASE_LAW',
      semesterId: 'sem-1st',
      semester: { id: 'sem-1st', name: '1st Semester' },
      subjectId: 'sub-con-law',
      subject: {
        id: 'sub-con-law',
        name: 'Constitutional Law',
        semester: { id: 'sem-1st', name: '1st Semester' },
        units: [
          {
            id: 'unit-1',
            name: 'Unit 1',
            resources: [{ id: 'res-1', title: 'Basic Structure', type: 'CASE_LAW' }],
          },
        ],
      },
      unitId: 'unit-cases',
      unit: { id: 'unit-cases', name: 'Prescribed Cases' },
      documentId: null,
      document: null,
      content: '<p>Landmark judgment on basic structure doctrine.</p>',
      featuredImage: null,
      metaTitle: 'Civil Cases',
      author: null,
      createdBy: null,
      createdAt: new Date('2026-01-01'),
    });

    (prisma.resource.findMany as any).mockResolvedValue([
      {
        id: 'case-2',
        title: 'Maneka Gandhi v. Union of India',
        type: 'CASE_LAW',
        createdAt: new Date('2026-01-02'),
        featuredImage: null,
        metaTitle: 'Writ Cases',
      },
    ]);

    const vdom = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'case-1' }),
    });

    expect(hasComponent(vdom, LatestCaseLawsSidebar)).toBe(true);
    expect(hasComponent(vdom, LatestPostsSidebar)).toBe(true);
    expect(hasComponent(vdom, StudyCurriculumSidebar)).toBe(false);
  });

  it('renders StudyCurriculumSidebar and omits LatestCaseLawsSidebar for regular law notes with units', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'note-regular-1',
      title: 'Jurisprudence Unit 1 Introduction',
      status: 'PUBLISHED',
      type: 'LAW_NOTE',
      semesterId: 'sem-1st',
      semester: { id: 'sem-1st', name: '1st Semester' },
      subjectId: 'sub-jur',
      subject: {
        id: 'sub-jur',
        name: 'Jurisprudence',
        semester: { id: 'sem-1st', name: '1st Semester' },
        units: [
          {
            id: 'unit-jur-1',
            name: 'Unit 1: Introduction to Law',
            resources: [{ id: 'note-regular-1', title: 'Jurisprudence Unit 1 Introduction', type: 'LAW_NOTE' }],
          },
        ],
      },
      unitId: 'unit-jur-1',
      unit: { id: 'unit-jur-1', name: 'Unit 1: Introduction to Law' },
      documentId: null,
      document: null,
      content: '<p>Introduction to schools of jurisprudence.</p>',
      featuredImage: null,
      metaTitle: null,
      author: null,
      createdBy: null,
      createdAt: new Date('2026-01-01'),
    });

    const vdom = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'note-regular-1' }),
    });

    expect(hasComponent(vdom, StudyCurriculumSidebar)).toBe(true);
    expect(hasComponent(vdom, LatestCaseLawsSidebar)).toBe(false);
  });

  it('omits StudyOutlineSidebar for prescribed cases in PDF view', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'case-pdf-1',
      title: 'Prescribed Case PDF Judgment',
      status: 'PUBLISHED',
      type: 'CASE_LAW',
      semesterId: 'sem-1st',
      semester: { id: 'sem-1st', name: '1st Semester' },
      subjectId: 'sub-con-law',
      subject: {
        id: 'sub-con-law',
        name: 'Constitutional Law',
        semester: { id: 'sem-1st', name: '1st Semester' },
        units: [
          {
            id: 'unit-cases',
            name: 'Prescribed Cases',
            resources: [{ id: 'case-pdf-1', title: 'Prescribed Case PDF Judgment', type: 'CASE_LAW' }],
          },
        ],
      },
      unitId: 'unit-cases',
      unit: { id: 'unit-cases', name: 'Prescribed Cases' },
      documentId: 'doc-case-1',
      document: { id: 'doc-case-1' },
      content: null,
      featuredImage: null,
      author: null,
      createdBy: null,
    });

    const vdom = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'case-pdf-1' }),
    });

    expect(hasComponent(vdom, StudyOutlineSidebar)).toBe(false);
  });

  it('renders StudyOutlineSidebar for regular law notes in PDF view on desktop', async () => {
    (prisma.resource.findUnique as any).mockResolvedValue({
      id: 'note-pdf-1',
      title: 'Law Note PDF',
      status: 'PUBLISHED',
      type: 'LAW_NOTE',
      semesterId: 'sem-1st',
      semester: { id: 'sem-1st', name: '1st Semester' },
      subjectId: 'sub-jur',
      subject: {
        id: 'sub-jur',
        name: 'Jurisprudence',
        semester: { id: 'sem-1st', name: '1st Semester' },
        units: [
          {
            id: 'unit-1',
            name: 'Unit 1',
            resources: [{ id: 'note-pdf-1', title: 'Law Note PDF', type: 'LAW_NOTE' }],
          },
        ],
      },
      unitId: 'unit-1',
      unit: { id: 'unit-1', name: 'Unit 1' },
      documentId: 'doc-note-1',
      document: { id: 'doc-note-1' },
      content: null,
      featuredImage: null,
      author: null,
      createdBy: null,
    });

    const vdom = await ReadResourcePage({
      params: Promise.resolve({ resourceId: 'note-pdf-1' }),
    });

    expect(hasComponent(vdom, StudyOutlineSidebar)).toBe(true);
  });
});

