import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentStatus, ResourceType, Role } from '@prisma/client';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/b2', () => ({ deleteObject: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  const resource = { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() };
  const auditLog = { create: vi.fn() };
  return {
    prisma: {
      user: { findUnique: vi.fn() },
      resource,
      auditLog,
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ resource, auditLog })),
    },
  };
});

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createResourceAction, setResourcePublishedAction } from '../admin-resource.actions';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;
const SUBJECT = '123e4567-e89b-12d3-a456-426614174000';
const RESOURCE = '123e4567-e89b-12d3-a456-426614174001';

function signInAs(role: Role) {
  mock(auth).mockResolvedValue({ user: { id: 'user-1', role } });
  mock(prisma.user.findUnique).mockResolvedValue({ role });
}

const newResource = { title: 'Contract Law Notes', subjectId: SUBJECT, isPremium: false, type: ResourceType.OLD_QUESTION, semesterId: SUBJECT };

describe('resource drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(Role.ADMIN);
    mock(prisma.resource.create).mockImplementation(async ({ data }) => ({ id: RESOURCE, ...data }));
    mock(prisma.resource.update).mockImplementation(async ({ data }) => ({ id: RESOURCE, title: 'Notes', status: data.status }));
  });

  it('creates a resource as a draft when asked', async () => {
    const res = await createResourceAction({ ...newResource, status: ContentStatus.DRAFT });
    expect(res.success).toBe(true);
    expect(mock(prisma.resource.create).mock.calls[0][0].data.status).toBe(ContentStatus.DRAFT);
  });

  it('keeps publishing by default so existing callers are unchanged', async () => {
    await createResourceAction(newResource);
    expect(mock(prisma.resource.create).mock.calls[0][0].data.status).toBe(ContentStatus.PUBLISHED);
  });

  it('does not allow creating a resource straight into the archive', async () => {
    const res = await createResourceAction({ ...newResource, status: 'ARCHIVED' as 'DRAFT' });
    expect(res.success).toBe(false);
    expect(prisma.resource.create).not.toHaveBeenCalled();
  });

  it('publishes a draft and moves a published resource back to draft', async () => {
    mock(prisma.resource.findUnique).mockResolvedValue({ status: ContentStatus.DRAFT, type: ResourceType.OLD_QUESTION });
    let res = await setResourcePublishedAction({ id: RESOURCE, published: true });
    expect(res).toEqual({ success: true, data: { status: ContentStatus.PUBLISHED } });

    mock(prisma.resource.findUnique).mockResolvedValue({ status: ContentStatus.PUBLISHED, type: ResourceType.OLD_QUESTION });
    res = await setResourcePublishedAction({ id: RESOURCE, published: false });
    expect(res).toEqual({ success: true, data: { status: ContentStatus.DRAFT } });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('leaves archived resources to the Restore button', async () => {
    mock(prisma.resource.findUnique).mockResolvedValue({ status: ContentStatus.ARCHIVED, type: ResourceType.OLD_QUESTION });
    const res = await setResourcePublishedAction({ id: RESOURCE, published: true });
    expect(res.success === false && res.error).toMatch(/archived/);
    expect(prisma.resource.update).not.toHaveBeenCalled();
  });

  it('keeps law notes and case laws admin-only for editors', async () => {
    signInAs(Role.EDITOR);
    mock(prisma.resource.findUnique).mockResolvedValue({ status: ContentStatus.DRAFT, type: ResourceType.CASE_LAW });
    const res = await setResourcePublishedAction({ id: RESOURCE, published: true });
    expect(res.success === false && res.error).toMatch(/Only admins/);
    expect(prisma.resource.update).not.toHaveBeenCalled();
  });

  it('rejects students and unknown resources', async () => {
    signInAs(Role.USER);
    expect((await setResourcePublishedAction({ id: RESOURCE, published: true })).success).toBe(false);

    signInAs(Role.ADMIN);
    mock(prisma.resource.findUnique).mockResolvedValue(null);
    const res = await setResourcePublishedAction({ id: RESOURCE, published: true });
    expect(res.success === false && res.error).toMatch(/not found/);
  });
});
