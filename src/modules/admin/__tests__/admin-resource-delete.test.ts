import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertTestDatabase, describeDb } from '@/test/db';

vi.mock('@/lib/b2', () => ({
  deleteObject: vi.fn(async () => undefined),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

let mockSession: { user: { id: string; role: string } } | null = null;
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => mockSession), authConfig: {} }));

import { deleteObject } from '@/lib/b2';
import { deleteResourceAction, setResourceArchivedAction } from '../admin-resource.actions';

/**
 * Runs against the disposable TEST_DATABASE_URL only. Everything it creates is
 * tagged with a run id and removed in afterAll; it does not truncate tables.
 */
describeDb('deleteResourceAction (integration, regression)', () => {
  const run = randomUUID().slice(0, 8);
  let adminId: string;
  let editorId: string;
  let studentId: string;
  let subjectId: string;
  let semesterId: string;

  const createResourceWithPdf = async (title: string, storageKey = `documents/${run}-${randomUUID()}.pdf`) => {
    const document = await prisma.document.create({
      data: { storageProvider: 'B2', storageKey, fileSize: 45, mimeType: 'application/pdf' },
    });
    const resource = await prisma.resource.create({
      data: { title: `${run} ${title}`, isPremium: false, subjectId, documentId: document.id },
    });
    await prisma.uploadIntent.create({
      data: {
        resourceId: resource.id,
        storageKey,
        expectedSize: 45,
        expectedMimeType: 'application/pdf',
        adminId,
        status: 'CONFIRMED',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    return { resource, document, storageKey };
  };

  beforeAll(async () => {
    await assertTestDatabase(prisma);
    const [admin, editor, student] = await Promise.all([
      prisma.user.create({ data: { email: `admin-${run}@example.test`, role: 'ADMIN' } }),
      prisma.user.create({ data: { email: `editor-${run}@example.test`, role: 'EDITOR' } }),
      prisma.user.create({ data: { email: `student-${run}@example.test`, role: 'USER' } }),
    ]);
    adminId = admin.id;
    editorId = editor.id;
    studentId = student.id;
    const semester = await prisma.semester.create({ data: { name: `Sem ${run}`, order: 99 } });
    semesterId = semester.id;
    const subject = await prisma.subject.create({ data: { name: `Subject ${run}`, semesterId } });
    subjectId = subject.id;
  });

  afterAll(async () => {
    const userIds = [adminId, editorId, studentId].filter(Boolean);
    const resources = await prisma.resource.findMany({
      where: { title: { startsWith: run } },
      select: { id: true, documentId: true },
    });
    const resourceIds = resources.map((r) => r.id);
    await prisma.accessLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { resourceId: { in: resourceIds } }] } });
    await prisma.purchase.deleteMany({ where: { resourceId: { in: resourceIds } } });
    await prisma.resource.deleteMany({ where: { id: { in: resourceIds } } });
    await prisma.document.deleteMany({ where: { storageKey: { startsWith: `documents/${run}` } } });
    await prisma.document.deleteMany({ where: { storageKey: { startsWith: `editorial/${run}` } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.semester.deleteMany({ where: { id: semesterId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  beforeEach(() => {
    vi.mocked(deleteObject).mockReset().mockResolvedValue(undefined);
    mockSession = { user: { id: adminId, role: 'ADMIN' } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deletes a resource whose PDF has been viewed, keeping the access history', async () => {
    const { resource, document, storageKey } = await createResourceWithPdf('viewed');
    // Opening the PDF (including the admin's own "View") writes this row; it
    // used to make the resource permanently undeletable.
    const log = await prisma.accessLog.create({
      data: { userId: adminId, resourceId: resource.id, documentId: document.id, action: 'VIEW_DOCUMENT' },
    });

    const res = await deleteResourceAction({ id: resource.id });

    expect(res).toEqual({ success: true, data: { success: true, filesRemoved: 1, filesFailed: 0 } });
    expect(await prisma.resource.findUnique({ where: { id: resource.id } })).toBeNull();
    expect(await prisma.document.findUnique({ where: { id: document.id } })).toBeNull();
    expect(await prisma.uploadIntent.count({ where: { resourceId: resource.id } })).toBe(0);
    const kept = await prisma.accessLog.findUnique({ where: { id: log.id } });
    expect(kept).toMatchObject({ action: 'VIEW_DOCUMENT', resourceId: null, documentId: null });
    expect(deleteObject).toHaveBeenCalledWith(storageKey);
    expect(await prisma.auditLog.count({ where: { entityId: resource.id, action: 'DELETE' } })).toBe(1);
  });

  it('refuses to delete a resource with purchases and changes nothing', async () => {
    const { resource, document } = await createResourceWithPdf('purchased');
    await prisma.purchase.create({ data: { userId: studentId, resourceId: resource.id, amountPaid: 100 } });

    const res = await deleteResourceAction({ id: resource.id });

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/purchases or entitlements.*Archive/);
    expect(await prisma.resource.findUnique({ where: { id: resource.id } })).not.toBeNull();
    expect(await prisma.document.findUnique({ where: { id: document.id } })).not.toBeNull();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('reports a storage failure without undoing the database delete', async () => {
    const { resource } = await createResourceWithPdf('storage-down');
    vi.mocked(deleteObject).mockRejectedValueOnce(new Error('storage unreachable'));

    const res = await deleteResourceAction({ id: resource.id });

    expect(res).toEqual({ success: true, data: { success: true, filesRemoved: 0, filesFailed: 1 } });
    expect(await prisma.resource.findUnique({ where: { id: resource.id } })).toBeNull();
  });

  it('keeps a stored file that another document still references', async () => {
    const sharedKey = `documents/${run}-shared.pdf`;
    const { resource } = await createResourceWithPdf('shared-a', sharedKey);
    await prisma.document.create({
      data: { storageProvider: 'B2', storageKey: sharedKey, fileSize: 45, mimeType: 'application/pdf' },
    });

    const res = await deleteResourceAction({ id: resource.id });

    expect(res).toEqual({ success: true, data: { success: true, filesRemoved: 0, filesFailed: 0 } });
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('never deletes storage keys outside documents/', async () => {
    const { resource } = await createResourceWithPdf('foreign-key', `editorial/${run}-not-ours.pdf`);

    const res = await deleteResourceAction({ id: resource.id });

    expect(res.success).toBe(true);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('removes the file of an upload that never got confirmed', async () => {
    const resource = await prisma.resource.create({ data: { title: `${run} pending`, isPremium: false, subjectId } });
    const pendingKey = `documents/${run}-pending.pdf`;
    await prisma.uploadIntent.create({
      data: {
        resourceId: resource.id, storageKey: pendingKey, expectedSize: 45, expectedMimeType: 'application/pdf',
        adminId, status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const res = await deleteResourceAction({ id: resource.id });

    expect(res).toEqual({ success: true, data: { success: true, filesRemoved: 1, filesFailed: 0 } });
    expect(deleteObject).toHaveBeenCalledWith(pendingKey);
  });

  it('enforces roles and validates ids', async () => {
    const { resource } = await createResourceWithPdf('protected');

    mockSession = { user: { id: editorId, role: 'EDITOR' } };
    const editor = await deleteResourceAction({ id: resource.id });
    expect(editor).toEqual({ success: false, error: 'Forbidden: Only admins can delete resources with a document.' });

    mockSession = { user: { id: studentId, role: 'USER' } };
    expect((await deleteResourceAction({ id: resource.id })).success).toBe(false);

    mockSession = null;
    expect((await deleteResourceAction({ id: resource.id })).success).toBe(false);

    mockSession = { user: { id: adminId, role: 'ADMIN' } };
    expect(await deleteResourceAction({ id: 'not-a-uuid' })).toEqual({ success: false, error: 'Invalid resource id' });
    expect(await deleteResourceAction({ id: randomUUID() })).toEqual({ success: false, error: 'Resource not found' });

    expect(await prisma.resource.findUnique({ where: { id: resource.id } })).not.toBeNull();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('archives and restores a resource that cannot be deleted', async () => {
    const { resource } = await createResourceWithPdf('archivable');

    expect(await setResourceArchivedAction({ id: resource.id, archived: true })).toEqual({
      success: true,
      data: { status: 'ARCHIVED' },
    });
    expect(await setResourceArchivedAction({ id: resource.id, archived: false })).toEqual({
      success: true,
      data: { status: 'PUBLISHED' },
    });

    mockSession = { user: { id: studentId, role: 'USER' } };
    expect((await setResourceArchivedAction({ id: resource.id, archived: true })).success).toBe(false);
    expect((await prisma.resource.findUnique({ where: { id: resource.id } }))?.status).toBe('PUBLISHED');
  });
});

describe('deleteResourceAction without a database', () => {
  it('is covered by the integration suite above when TEST_DATABASE_URL is set', () => {
    expect(typeof deleteResourceAction).toBe('function');
  });
});
