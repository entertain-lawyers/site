import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { serializeSocialLinks } from '@/lib/social-links';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/safe-action', () => ({
  createSafeAction: (handler: any) => {
    return async (input: any) => {
      try {
        const data = await handler(input, {
          userId: 'admin-user-id',
          role: Role.ADMIN,
        });
        return { success: true, data };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    };
  },
}));

import { createTeamMemberAction, updateTeamMemberAction } from '../admin-team.actions';

describe('admin-team.actions with Direct Connect links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates team member with structured JSON direct connect links in websiteUrl', async () => {
    const directLinks = [
      { id: '1', platform: 'github' as const, url: 'https://github.com/entertain' },
      { id: '2', platform: 'youtube' as const, url: 'https://youtube.com/@entertainlawyers' },
    ];
    const serializedWebsite = serializeSocialLinks(directLinks);

    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.teamMember.create).mockResolvedValue({
      id: 'uuid-1',
      name: 'Amritesh Mishra',
      designation: 'Technical Lead',
      slug: 'amritesh-mishra',
      websiteUrl: serializedWebsite,
    } as any);

    const result = await createTeamMemberAction({
      name: 'Amritesh Mishra',
      designation: 'Technical Lead',
      slug: 'amritesh-mishra',
      linkedinUrl: 'https://linkedin.com/in/amritesh',
      facebookUrl: 'https://facebook.com/amritesh',
      instagramUrl: 'https://instagram.com/amritesh',
      websiteUrl: serializedWebsite,
      displayOrder: 1,
      isPublished: true,
    });

    expect(result.success).toBe(true);
    expect(prisma.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Amritesh Mishra',
          websiteUrl: serializedWebsite,
        }),
      })
    );
  });

  it('accepts null/undefined/empty string websiteUrl', async () => {
    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.teamMember.create).mockResolvedValue({
      id: 'uuid-2',
      name: 'Test Advocate',
      designation: 'Advocate',
      slug: 'test-advocate',
      websiteUrl: null,
    } as any);

    const result = await createTeamMemberAction({
      name: 'Test Advocate',
      designation: 'Advocate',
      websiteUrl: null,
      displayOrder: 0,
      isPublished: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid direct connect link JSON with invalid URLs', async () => {
    const invalidJson = JSON.stringify([
      { id: '1', platform: 'github', url: 'not-a-valid-url-at-all' },
    ]);

    const result = await createTeamMemberAction({
      name: 'Test Advocate',
      designation: 'Advocate',
      websiteUrl: invalidJson,
      displayOrder: 0,
      isPublished: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid URL or direct connect link format');
    }
  });

  it('successfully updates team member direct connect links', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const directLinks = [
      { id: '1', platform: 'whatsapp' as const, url: 'https://wa.me/9779800000000' },
    ];
    const serializedWebsite = serializeSocialLinks(directLinks);

    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id,
      slug: 'updated-member',
    } as any);
    vi.mocked(prisma.teamMember.update).mockResolvedValue({
      id,
      name: 'Updated Member',
      designation: 'Senior Counsel',
      slug: 'updated-member',
      websiteUrl: serializedWebsite,
    } as any);

    const result = await updateTeamMemberAction({
      id,
      name: 'Updated Member',
      designation: 'Senior Counsel',
      websiteUrl: serializedWebsite,
      displayOrder: 2,
      isPublished: true,
    });

    expect(result.success).toBe(true);
    expect(prisma.teamMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id },
        data: expect.objectContaining({
          websiteUrl: serializedWebsite,
        }),
      })
    );
  });
});
