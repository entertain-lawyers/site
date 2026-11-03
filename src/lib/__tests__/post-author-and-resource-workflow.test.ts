/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePostAuthorForDisplay, batchResolvePostAuthorsForDisplay } from '@/lib/post-author';
import { getPublicPostUrl } from '@/lib/post-url';
import { writePostPreviewDraft } from '@/lib/post-preview';
import { prisma } from '@/lib/prisma';
import { createResourceAction, updateResourceAction } from '@/modules/admin/admin-resource.actions';
import { ResourceType, ContentStatus, Role } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    resource: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe('Author attribution and resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves author via direct local user mapping for English', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'user-1',
      name: 'Advocate Ramesh Sharma',
      email: 'ramesh@example.com',
      image: 'https://example.com/ramesh.jpg',
      bio: 'Senior Supreme Court Advocate with 20 years experience.',
      website: 'https://ramesh-law.com',
      role: 'ADMIN',
    });

    const result = await resolvePostAuthorForDisplay({
      wpPost: {
        id: 123,
        author: 45,
      },
      lang: 'en',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { wpAuthorIdEn: 45 },
      select: expect.any(Object),
    });
    expect(result.name).toBe('Advocate Ramesh Sharma');
    expect(result.image).toBe('https://example.com/ramesh.jpg');
    expect(result.bio).toBe('Senior Supreme Court Advocate with 20 years experience.');
    expect(result.website).toBe('https://ramesh-law.com');
    expect(result.initials).toBe('AR');
  });

  it('resolves author via direct local user mapping for Nepali', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'user-2',
      name: 'सुमन अधिकारी',
      email: 'suman@example.com',
      image: 'https://example.com/suman.jpg',
      bio: '',
      website: null,
      role: 'EDITOR',
    });

    const result = await resolvePostAuthorForDisplay({
      wpPost: {
        id: 456,
        author: 78,
      },
      lang: 'ne',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { wpAuthorIdNe: 78 },
      select: expect.any(Object),
    });
    expect(result.name).toBe('सुमन अधिकारी');
    expect(result.image).toBe('https://example.com/suman.jpg');
    expect(result.bio).toContain('कानुनी');
    expect(result.initials).toBeDefined();
  });

  it('resolves author via audit log fallback when local mapping is unmapped', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    (prisma.auditLog.findFirst as any).mockResolvedValue({
      details: {
        authorUserId: 'local-author-99',
        authorName: 'Guest Writer',
      },
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'local-author-99',
      name: 'Pooja Thapa',
      email: 'pooja@example.com',
      image: 'https://example.com/pooja.png',
      bio: 'Corporate Law Specialist',
      website: 'https://poojalaw.org',
      role: 'USER',
    });

    const result = await resolvePostAuthorForDisplay({
      wpPost: {
        id: 789,
        author: 1, // Service account on WordPress
      },
      lang: 'en',
    });

    expect(result.name).toBe('Pooja Thapa');
    expect(result.image).toBe('https://example.com/pooja.png');
    expect(result.bio).toBe('Corporate Law Specialist');
    expect(result.website).toBe('https://poojalaw.org');
  });

  it('resolves author via WordPress embedded author when not found in database', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    (prisma.auditLog.findFirst as any).mockResolvedValue(null);

    const result = await resolvePostAuthorForDisplay({
      wpPost: {
        id: 999,
        author: 200,
        _embedded: {
          author: [
            {
              name: 'WordPress Embedded Contributor',
              description: 'Independent legal contributor',
              url: 'https://contributor.law',
              avatar_urls: {
                '96': 'https://secure.gravatar.com/avatar/sample96.jpg',
              },
            },
          ],
        },
      },
      lang: 'en',
    });

    expect(result.name).toBe('WordPress Embedded Contributor');
    expect(result.image).toBe('https://secure.gravatar.com/avatar/sample96.jpg');
    expect(result.bio).toBe('Independent legal contributor');
    expect(result.website).toBe('https://contributor.law');
  });

  it('falls back gracefully to localized default author when no data exists', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    (prisma.auditLog.findFirst as any).mockResolvedValue(null);

    const enResult = await resolvePostAuthorForDisplay({
      wpPost: { id: 1000 },
      lang: 'en',
    });
    expect(enResult.name).toBe('Entertain Lawyers');
    expect(enResult.image).toBeNull();
    expect(enResult.bio).toContain('Entertain Lawyers');

    const neResult = await resolvePostAuthorForDisplay({
      wpPost: { id: 1001 },
      lang: 'ne',
    });
    expect(neResult.name).toBe('सम्पादक');
    expect(neResult.image).toBeNull();
    expect(neResult.bio).toContain('कानुनी');
  });

  it('batch resolves multiple posts correctly without N+1 query loops', async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      {
        id: 'user-mapped-1',
        name: 'Mapped User 1',
        email: 'user1@example.com',
        image: 'https://example.com/u1.jpg',
        bio: 'Bio 1',
        website: null,
        role: 'ADMIN',
        wpAuthorIdEn: 10,
        wpAuthorIdNe: 20,
      },
    ]);
    (prisma.auditLog.findMany as any).mockResolvedValue([
      {
        entityId: 'post-2',
        details: { authorName: 'Audit Author' },
      },
    ]);

    const posts = [
      { id: 'post-1', author: 10 },
      { id: 'post-2', author: 99 },
      {
        id: 'post-3',
        author: 88,
        _embedded: {
          author: [{ name: 'Embedded Author', avatar_urls: { '96': 'https://example.com/emb.jpg' } }],
        },
      },
    ];

    const batch = await batchResolvePostAuthorsForDisplay({
      posts,
      lang: 'en',
    });

    expect(batch.get('post-1')?.name).toBe('Mapped User 1');
    expect(batch.get('post-1')?.image).toBe('https://example.com/u1.jpg');
    expect(batch.get('post-2')?.name).toBe('Audit Author');
    expect(batch.get('post-3')?.name).toBe('Embedded Author');
  });
});

describe('Public Post URLs resolution (View Post)', () => {
  it('resolves correct URLs for English posts', () => {
    expect(getPublicPostUrl({ id: 123, type: 'BLOG', lang: 'en' })).toBe('/blogs/123');
    expect(getPublicPostUrl({ id: 124, type: 'OPINION', lang: 'en' })).toBe('/blogs/124');
    expect(getPublicPostUrl({ id: 125, type: 'NEWS', lang: 'en' })).toBe('/news/125');
    expect(getPublicPostUrl({ id: 126, type: 'FACT', lang: 'en' })).toBe('/historical-facts/126');
    expect(getPublicPostUrl({ id: 127, type: 'PERSONALITY', lang: 'en' })).toBe('/historical-facts/127');
    expect(getPublicPostUrl({ id: 128, type: 'CASE_LAW', lang: 'en' })).toBe('/resources/128');
  });

  it('resolves correct URLs for Nepali posts', () => {
    expect(getPublicPostUrl({ id: 201, type: 'NEWS', lang: 'ne' })).toBe('/nepali/post/201');
    expect(getPublicPostUrl({ id: 202, type: 'NEPALI_SAMANYA_SAMACHAR', lang: 'ne' })).toBe('/nepali/post/202');
    expect(getPublicPostUrl({ id: 203, type: 'NEPALI_BLOG_BICHAR', lang: 'en' })).toBe('/nepali/post/203');
  });
});

describe('Preview handoff author & featured image persistence', () => {
  it('serializes and deserializes author and featuredImage in post preview draft', () => {
    const mockStorage: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; },
    };
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { localStorage: localStorageMock });

    writePostPreviewDraft({
      title: 'Landmark Supreme Court Ruling',
      content: '<p>Ruling details</p>',
      type: 'CASE_LAW',
      featuredImage: 'https://example.com/featured-case.jpg',
      author: {
        name: 'Senior Advocate B. Sharma',
        email: 'bsharma@example.com',
        image: 'https://example.com/bsharma.jpg',
        bio: 'Constitutional law expert',
        website: 'https://bsharma.law',
        role: 'ADMIN',
      },
      editorUrl: '/admin/study/resources/1/edit',
    });

    const stored = mockStorage['el-post-preview-draft'];
    expect(stored).toBeDefined();
    const draft = JSON.parse(stored);
    expect(draft.title).toBe('Landmark Supreme Court Ruling');
    expect(draft.featuredImage).toBe('https://example.com/featured-case.jpg');
    expect(draft.author?.name).toBe('Senior Advocate B. Sharma');
    expect(draft.author?.image).toBe('https://example.com/bsharma.jpg');
    expect(draft.author?.bio).toBe('Constitutional law expert');
    expect(draft.author?.website).toBe('https://bsharma.law');

    vi.unstubAllGlobals();
  });
});

describe('Resource Actions featured image and Case Law support', () => {
  beforeEach(() => {
    (auth as any).mockResolvedValue({
      user: { id: 'admin-user-id', role: Role.ADMIN },
    });
  });

  it('persists featuredImage and featuredImageId on createResourceAction and returns url', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'admin-user-id',
      name: 'Admin User',
      role: Role.ADMIN,
      wpAuthorIdEn: 10,
    });

    (prisma.resource.create as any).mockResolvedValue({
      id: 'resource-uuid-1',
      title: 'Kesavananda Bharati Case Summary',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
    });

    const res = await createResourceAction({
      title: 'Kesavananda Bharati Case Summary',
      type: ResourceType.CASE_LAW,
      subjectId: 'sub-1',
      isPremium: false,
      status: ContentStatus.PUBLISHED,
      featuredImage: 'https://example.com/kesavananda.jpg',
      featuredImageId: 882,
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('Action failed');
    expect(res.data.resourceId).toBe('resource-uuid-1');
    expect(res.data.url).toBe('/resources/resource-uuid-1');

    expect(prisma.resource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Kesavananda Bharati Case Summary',
          type: ResourceType.CASE_LAW,
          featuredImage: 'https://example.com/kesavananda.jpg',
          featuredImageId: 882,
        }),
      })
    );
  });

  it('updates featuredImage and featuredImageId on updateResourceAction and returns url', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'admin-user-id',
      name: 'Admin User',
      role: Role.ADMIN,
    });

    (prisma.resource.update as any).mockResolvedValue({
      id: 'resource-uuid-1',
      title: 'Updated Case Law',
      type: ResourceType.CASE_LAW,
      status: ContentStatus.PUBLISHED,
    });

    const res = await updateResourceAction({
      id: 'resource-uuid-1',
      title: 'Updated Case Law',
      type: ResourceType.CASE_LAW,
      subjectId: 'sub-1',
      isPremium: false,
      status: ContentStatus.PUBLISHED,
      featuredImage: 'https://example.com/new-image.jpg',
      featuredImageId: 994,
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('Action failed');
    expect(res.data.url).toBe('/resources/resource-uuid-1');

    expect(prisma.resource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resource-uuid-1' },
        data: expect.objectContaining({
          title: 'Updated Case Law',
          featuredImage: 'https://example.com/new-image.jpg',
          featuredImageId: 994,
        }),
      })
    );
  });
});
