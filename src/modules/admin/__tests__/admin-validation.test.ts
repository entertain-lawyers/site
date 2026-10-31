import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, Role } from '@prisma/client';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'ADMIN' } })) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

const { model } = vi.hoisted(() => ({
  model: () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => ({ role: Role.ADMIN })) },
    auditLog: { create: vi.fn() },
    unit: model(),
    semester: model(),
    subject: model(),
    event: model(),
    publication: model(),
    fAQ: model(),
    gallery: model(),
    galleryImage: model(),
    builderPage: model(),
    teamMember: model(),
  },
}));

import { prisma } from '@/lib/prisma';
import type { Mock } from 'vitest';

/** The prisma module is mocked above; this reaches the vi.fn() behind a delegate method. */
const mock = (fn: unknown) => fn as Mock;
type CreateArgs = { data: Record<string, unknown> };
import { createUnitAction, deleteUnitAction } from '../admin-unit.actions';
import { createSemesterAction } from '../admin-semester.actions';
import { createSubjectAction } from '../admin-subject.actions';
import { createEventAction, deleteEventAction } from '../admin-event.actions';
import { createPublicationAction } from '../admin-publication.actions';
import { deleteFAQAction, reorderFAQAction } from '../admin-faq.actions';
import { deleteGalleryImageAction } from '../admin-gallery.actions';
import { createBuilderPageAction, deleteBuilderPageAction } from '../admin-page.actions';
import { createTeamMemberAction } from '../admin-team.actions';

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
const notFound = () =>
  new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'test' });

const SUBJECT_ID = '33333333-3333-4333-8333-333333333333';

describe('admin action input validation (regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('rejects a whitespace-only unit name before touching the database', async () => {
    const res = await createUnitAction({ name: '   ', subjectId: SUBJECT_ID, order: 0 });
    expect(res).toEqual({ success: false, error: 'Invalid input: Unit name is required' });
    expect(prisma.unit.create).not.toHaveBeenCalled();
  });

  it('rejects a malformed subject id for units', async () => {
    const res = await createUnitAction({ name: 'Unit 1', subjectId: 'nope', order: 0 });
    expect(res.success).toBe(false);
    expect(prisma.unit.create).not.toHaveBeenCalled();
  });

  it('rejects malformed ids on delete', async () => {
    for (const action of [deleteUnitAction, deleteEventAction, deleteFAQAction, deleteGalleryImageAction, deleteBuilderPageAction]) {
      const res = await (action as (a: unknown) => Promise<{ success: boolean }>)({ id: "' OR 1=1" });
      expect(res.success).toBe(false);
    }
    expect(prisma.unit.findUnique).not.toHaveBeenCalled();
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
    expect(prisma.builderPage.delete).not.toHaveBeenCalled();
  });

  it('validates semester and subject slugs on the server', async () => {
    const semester = await createSemesterAction({ name: 'Sem', slug: 'Bad Slug!', order: 0 });
    expect(semester.success).toBe(false);
    if (!semester.success) expect(semester.error).toMatch(/Slug must contain only lowercase/);

    const subject = await createSubjectAction({ name: 'Law', slug: '../x', order: 0, semesterId: SUBJECT_ID });
    expect(subject.success).toBe(false);
    expect(prisma.semester.create).not.toHaveBeenCalled();
    expect(prisma.subject.create).not.toHaveBeenCalled();
  });

  it('rejects a reorder with an unknown direction', async () => {
    const res = await reorderFAQAction({ id: SUBJECT_ID, direction: 'SIDEWAYS' as 'UP' });
    expect(res.success).toBe(false);
    expect(prisma.fAQ.findMany).not.toHaveBeenCalled();
  });

  it('reports a duplicate event slug instead of a generic error', async () => {
    mock(prisma.event.create).mockRejectedValueOnce(uniqueViolation());
    const res = await createEventAction({ title: 'Moot', slug: 'moot', eventDate: '2026-11-01', status: 'DRAFT' });
    expect(res).toEqual({
      success: false,
      error: 'An event with this slug already exists. Choose a different slug.',
    });
  });

  it('rejects an invalid event date', async () => {
    const res = await createEventAction({ title: 'Moot', slug: 'moot', eventDate: 'not a date', status: 'DRAFT' });
    expect(res.success).toBe(false);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('reports a duplicate publication slug and rejects unsafe asset links', async () => {
    mock(prisma.publication.create).mockRejectedValueOnce(uniqueViolation());
    const dup = await createPublicationAction({ title: 'Journal', slug: 'journal', status: 'DRAFT' });
    expect(dup).toEqual({
      success: false,
      error: 'A publication with this slug already exists. Choose a different slug.',
    });

    const unsafe = await createPublicationAction({
      title: 'Journal',
      slug: 'journal-2',
      status: 'DRAFT',
      coverImage: 'javascript:alert(1)',
    });
    expect(unsafe.success).toBe(false);
  });

  it('reports a duplicate or missing builder page clearly', async () => {
    mock(prisma.builderPage.create).mockRejectedValueOnce(uniqueViolation());
    const dup = await createBuilderPageAction({ title: 'About', slug: 'about', status: 'DRAFT' });
    expect(dup).toEqual({ success: false, error: 'A page with this slug already exists. Choose a different slug.' });

    mock(prisma.builderPage.delete).mockRejectedValueOnce(notFound());
    const missing = await deleteBuilderPageAction({ id: SUBJECT_ID });
    expect(missing).toEqual({ success: false, error: 'Page not found' });
  });

  it('creates team members with romanized slugs and rejects unsafe image links', async () => {
    mock(prisma.teamMember.findFirst).mockResolvedValue(null);
    mock(prisma.teamMember.create).mockImplementation(async ({ data }: CreateArgs) => ({ id: 't-1', ...data }));

    const ok = await createTeamMemberAction({
      name: 'सीता शर्मा',
      designation: 'Editor',
      displayOrder: 0,
      isPublished: false,
    });
    expect(ok.success).toBe(true);
    expect(mock(prisma.teamMember.create).mock.calls[0][0].data.slug).toBe('sita-sharma');

    const bad = await createTeamMemberAction({
      name: 'Sita',
      designation: 'Editor',
      imageUrl: '//evil.example/x.png',
      displayOrder: 0,
      isPublished: false,
    });
    expect(bad.success).toBe(false);
  });
});
