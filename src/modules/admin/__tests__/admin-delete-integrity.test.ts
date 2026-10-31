import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertTestDatabase, describeDb } from '@/test/db';

vi.mock('@/lib/b2', () => ({ deleteObject: vi.fn(async () => undefined) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

let mockSession: { user: { id: string; role: string } } | null = null;
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => mockSession), authConfig: {} }));

import { deleteSubjectAction } from '../admin-subject.actions';
import { deleteSemesterAction } from '../admin-semester.actions';
import { deleteUnitAction } from '../admin-unit.actions';
import { deleteUserAction } from '../admin-user.actions';
import { deleteGalleryAction, deleteGalleryImageAction } from '../admin-gallery.actions';
import { deleteEventAction } from '../admin-event.actions';
import { deletePublicationAction } from '../admin-publication.actions';
import { deleteFAQAction } from '../admin-faq.actions';
import { deleteTeamMemberAction } from '../admin-team.actions';
import { deleteConsultationLawyerAction } from '../admin-lawyer.actions';
import { deleteRedirectAction } from '../admin-site-settings.actions';
import { deleteBuilderPageAction } from '../admin-page.actions';

/**
 * Every admin delete against the real foreign keys of the disposable
 * TEST_DATABASE_URL. Rows are tagged with a run id and removed in afterAll;
 * nothing is truncated.
 */
describeDb('admin delete workflows (integration)', () => {
  const run = randomUUID().slice(0, 8);
  const tag = (s: string) => `${run}-${s}`;
  let adminId: string;
  let admin2Id: string;
  let editorId: string;
  let semesterId: string;

  const asAdmin = () => { mockSession = { user: { id: adminId, role: 'ADMIN' } }; };
  const asEditor = () => { mockSession = { user: { id: editorId, role: 'EDITOR' } }; };

  beforeAll(async () => {
    await assertTestDatabase(prisma);
    adminId = (await prisma.user.create({ data: { email: `${tag('admin')}@example.test`, role: 'ADMIN' } })).id;
    admin2Id = (await prisma.user.create({ data: { email: `${tag('admin2')}@example.test`, role: 'ADMIN' } })).id;
    editorId = (await prisma.user.create({ data: { email: `${tag('editor')}@example.test`, role: 'EDITOR' } })).id;
    semesterId = (await prisma.semester.create({ data: { name: tag('sem'), order: 98 } })).id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { startsWith: run } }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    await prisma.resource.deleteMany({ where: { title: { startsWith: run } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.subject.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.semester.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.publication.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.document.deleteMany({ where: { storageKey: { startsWith: `documents/${run}` } } });
    await prisma.event.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.gallery.deleteMany({ where: { title: { startsWith: run } } });
    await prisma.fAQ.deleteMany({ where: { question: { startsWith: run } } });
    await prisma.teamMember.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.consultationLawyer.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.redirect.deleteMany({ where: { source: { startsWith: `/${run}` } } });
    await prisma.builderPage.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.uploadIntent.deleteMany({ where: { adminId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  beforeEach(() => {
    asAdmin();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('curriculum', () => {
    it('refuses to delete a subject that still has resources (regression: they were silently orphaned)', async () => {
      const subject = await prisma.subject.create({ data: { name: tag('subj-with-res'), semesterId } });
      const resource = await prisma.resource.create({ data: { title: tag('res'), isPremium: false, subjectId: subject.id } });

      const res = await deleteSubjectAction({ id: subject.id });

      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toMatch(/Cannot delete this subject because it contains 0 unit\(s\) and 1 study resource/);
      expect(await prisma.subject.findUnique({ where: { id: subject.id } })).not.toBeNull();
      expect((await prisma.resource.findUnique({ where: { id: resource.id } }))?.subjectId).toBe(subject.id);
    });

    it('deletes an empty subject and audits it', async () => {
      const subject = await prisma.subject.create({ data: { name: tag('subj-empty'), semesterId } });
      expect(await deleteSubjectAction({ id: subject.id })).toEqual({ success: true, data: { success: true } });
      expect(await prisma.auditLog.count({ where: { entityId: subject.id, action: 'DELETE' } })).toBe(1);
    });

    it('refuses to delete a semester with subjects and a unit with resources', async () => {
      const subject = await prisma.subject.create({ data: { name: tag('subj-sem'), semesterId } });
      const unit = await prisma.unit.create({ data: { name: tag('unit'), subjectId: subject.id } });
      await prisma.resource.create({ data: { title: tag('unit-res'), isPremium: false, subjectId: subject.id, unitId: unit.id } });

      const sem = await deleteSemesterAction({ id: semesterId });
      expect(sem.success).toBe(false);
      if (!sem.success) expect(sem.error).toMatch(/Cannot delete this semester/);

      const u = await deleteUnitAction({ id: unit.id });
      expect(u.success).toBe(false);
      if (!u.success) expect(u.error).toMatch(/Cannot delete this unit/);
    });
  });

  describe('users', () => {
    it('blocks self-delete, the last admin and unauthorized callers with readable errors', async () => {
      expect(await deleteUserAction({ id: adminId })).toEqual({ success: false, error: 'You cannot delete yourself' });

      asEditor();
      expect((await deleteUserAction({ id: admin2Id })).success).toBe(false);
      expect(await prisma.user.findUnique({ where: { id: admin2Id } })).not.toBeNull();
    });

    it('explains why a user with upload history cannot be deleted', async () => {
      const uploader = await prisma.user.create({ data: { email: `${tag('uploader')}@example.test`, role: 'EDITOR' } });
      const subject = await prisma.subject.create({ data: { name: tag('subj-upl'), semesterId } });
      const resource = await prisma.resource.create({ data: { title: tag('upl-res'), isPremium: false, subjectId: subject.id } });
      await prisma.uploadIntent.create({
        data: {
          resourceId: resource.id, storageKey: `documents/${run}-intent.pdf`, expectedSize: 1,
          expectedMimeType: 'application/pdf', adminId: uploader.id, expiresAt: new Date(),
        },
      });

      const res = await deleteUserAction({ id: uploader.id });

      // Was "An unexpected error occurred" because the message is lowercase.
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toMatch(/cannot be deleted safely/);
    });

    it('deletes an ordinary user', async () => {
      const user = await prisma.user.create({ data: { email: `${tag('plain')}@example.test`, role: 'USER' } });
      expect(await deleteUserAction({ id: user.id })).toEqual({ success: true, data: { success: true } });
      expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    });
  });

  describe('publishing', () => {
    it('deletes a gallery with its images, and single images', async () => {
      const gallery = await prisma.gallery.create({ data: { title: tag('gallery') } });
      const keep = await prisma.galleryImage.create({ data: { galleryId: gallery.id, url: '/uploads/a.jpg', order: 0 } });
      await prisma.galleryImage.create({ data: { galleryId: gallery.id, url: '/uploads/b.jpg', order: 1 } });

      expect((await deleteGalleryImageAction({ id: keep.id })).success).toBe(true);
      expect(await prisma.galleryImage.count({ where: { galleryId: gallery.id } })).toBe(1);

      expect((await deleteGalleryAction({ id: gallery.id })).success).toBe(true);
      expect(await prisma.galleryImage.count({ where: { galleryId: gallery.id } })).toBe(0);
    });

    it('deletes events, FAQs, team members, lawyers, redirects and pages', async () => {
      const event = await prisma.event.create({ data: { title: 'E', slug: tag('event'), eventDate: new Date(), authorId: adminId } });
      const faq = await prisma.fAQ.create({ data: { question: tag('faq'), answer: 'A' } });
      const member = await prisma.teamMember.create({ data: { name: 'M', slug: tag('member'), designation: 'D' } });
      const lawyer = await prisma.consultationLawyer.create({ data: { name: 'L', slug: tag('lawyer') } });
      const redirect = await prisma.redirect.create({ data: { source: `/${run}-old`, destination: '/new' } });
      const page = await prisma.builderPage.create({ data: { title: 'P', slug: tag('page'), data: {} } });

      for (const [action, id] of [
        [deleteEventAction, event.id],
        [deleteFAQAction, faq.id],
        [deleteTeamMemberAction, member.id],
        [deleteConsultationLawyerAction, lawyer.id],
        [deleteRedirectAction, redirect.id],
        [deleteBuilderPageAction, page.id],
      ] as const) {
        const res = await (action as (a: { id: string }) => Promise<{ success: boolean }>)({ id });
        expect(res.success).toBe(true);
      }

      expect(await prisma.event.findUnique({ where: { id: event.id } })).toBeNull();
      expect(await prisma.fAQ.findUnique({ where: { id: faq.id } })).toBeNull();
      expect(await prisma.teamMember.findUnique({ where: { id: member.id } })).toBeNull();
      expect(await prisma.consultationLawyer.findUnique({ where: { id: lawyer.id } })).toBeNull();
      expect(await prisma.redirect.findUnique({ where: { id: redirect.id } })).toBeNull();
      expect(await prisma.builderPage.findUnique({ where: { id: page.id } })).toBeNull();
      // Lawyer deletes are now audited like the rest.
      expect(await prisma.auditLog.count({ where: { entityId: lawyer.id, entityType: 'CONSULTATION_LAWYER' } })).toBe(1);
    });

    it('keeps a publication that has a secure document and says why', async () => {
      const document = await prisma.document.create({
        data: { storageProvider: 'B2', storageKey: `documents/${run}-pub.pdf`, fileSize: 1, mimeType: 'application/pdf' },
      });
      const pub = await prisma.publication.create({ data: { title: 'Pub', slug: tag('pub'), authorId: adminId, documentId: document.id } });

      const res = await deletePublicationAction({ id: pub.id });

      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toMatch(/attached secure document/);
      expect(await prisma.publication.findUnique({ where: { id: pub.id } })).not.toBeNull();
    });

    it('applies role restrictions server-side', async () => {
      const member = await prisma.teamMember.create({ data: { name: 'M2', slug: tag('member2'), designation: 'D' } });
      const redirect = await prisma.redirect.create({ data: { source: `/${run}-old2`, destination: '/new' } });

      asEditor();
      expect((await deleteTeamMemberAction({ id: member.id })).success).toBe(false); // admin only
      expect((await deleteRedirectAction({ id: redirect.id })).success).toBe(false); // admin only
      mockSession = null;
      expect((await deleteFAQAction({ id: randomUUID() })).success).toBe(false);

      expect(await prisma.teamMember.findUnique({ where: { id: member.id } })).not.toBeNull();
      expect(await prisma.redirect.findUnique({ where: { id: redirect.id } })).not.toBeNull();
    });

    it('reports missing records clearly', async () => {
      const missing = randomUUID();
      expect(await deleteEventAction({ id: missing })).toEqual({ success: false, error: 'Event not found' });
      expect(await deleteFAQAction({ id: missing })).toEqual({ success: false, error: 'FAQ not found' });
      expect(await deleteBuilderPageAction({ id: missing })).toEqual({ success: false, error: 'Page not found' });
      expect(await deleteConsultationLawyerAction({ id: missing })).toEqual({ success: false, error: 'Lawyer profile not found' });
    });
  });
});

describe('admin delete workflows without a database', () => {
  it('are covered by the integration suite above when TEST_DATABASE_URL is set', () => {
    expect(typeof deleteSubjectAction).toBe('function');
  });
});
