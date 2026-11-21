/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ResourceType, ContentStatus, Role } from '@prisma/client';
import { renderToStaticMarkup } from 'react-dom/server';

const { mockPrisma } = vi.hoisted(() => {
  const resource = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  };
  const user = { findUnique: vi.fn(), count: vi.fn() };
  const subject = { findMany: vi.fn(), findUnique: vi.fn() };
  const unit = { findMany: vi.fn(), findUnique: vi.fn() };
  const semester = { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() };
  const consultationLawyer = { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() };
  const teamMember = { findMany: vi.fn(), count: vi.fn() };
  const auditLog = { create: vi.fn() };

  return {
    mockPrisma: {
      user,
      resource,
      subject,
      unit,
      semester,
      consultationLawyer,
      teamMember,
      auditLog,
      $queryRaw: vi.fn().mockResolvedValue([]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(async (fnOrArray: any) => {
        if (Array.isArray(fnOrArray)) return Promise.all(fnOrArray);
        return fnOrArray({ user, resource, subject, unit, semester, consultationLawyer, teamMember, auditLog });
      }),
    },
  };
});

let mockSessionUser: { id: string; role: Role } | null = {
  id: 'editor-1',
  role: Role.EDITOR,
};

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => (mockSessionUser ? { user: mockSessionUser } : null)),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin',
  notFound: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

vi.mock('@/lib/content-authors', () => ({
  listLocalAuthorsWithStatus: vi.fn().mockResolvedValue({
    authors: [{ id: 'editor-1', name: 'Editor Amrit', role: Role.EDITOR }],
    authorMappingAvailable: true,
  }),
  resolveLocalAuthor: vi.fn().mockResolvedValue({ id: 'editor-1', name: 'Editor Amrit', role: Role.EDITOR }),
}));

vi.mock('@/lib/wordpress', () => ({
  getWordPressWriteBlock: vi.fn().mockReturnValue(null),
}));

import { AdminResourceForm } from '@/components/admin/AdminResourceForm';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminResourcesPage from '@/app/admin/study/resources/page';
import {
  createResourceAction,
  updateResourceAction,
  setResourcePublishedAction,
} from '@/modules/admin/admin-resource.actions';
import AdminAiPage from '@/app/admin/ai/page';
import AdminLawyersPage from '@/app/admin/lawyers/page';
import AdminTeamPage from '@/app/admin/team/page';
import { deleteComment } from '@/lib/comments';

describe('Editor Law Notes & Comprehensive RBAC Verification', () => {
  const SEMESTER_ID = 'sem-1';
  const SUBJECT_ID = 'sub-1';
  const UNIT_ID = 'unit-1';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUser = { id: 'editor-1', role: Role.EDITOR };

    mockPrisma.semester.findMany.mockResolvedValue([
      { id: SEMESTER_ID, name: '1st Semester', order: 1 },
    ]);
    mockPrisma.subject.findMany.mockResolvedValue([
      { id: SUBJECT_ID, name: 'Jurisprudence', semesterId: SEMESTER_ID },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: UNIT_ID, name: 'Unit 1: Introduction', subjectId: SUBJECT_ID, order: 1 },
    ]);
    mockPrisma.resource.count.mockResolvedValue(1);
    mockPrisma.resource.groupBy.mockResolvedValue([
      { status: ContentStatus.PUBLISHED, _count: { _all: 1 } },
    ]);
  });

  describe('1. Editor Access to Law Notes Option in Admin Panel', () => {
    it('renders "Law Note" in the Resource Type dropdown for an Editor in AdminResourceForm', () => {
      const html = renderToStaticMarkup(
        <AdminResourceForm
          semesters={[{ id: SEMESTER_ID, name: '1st Semester' }]}
          subjects={[{ id: SUBJECT_ID, name: 'Jurisprudence', semesterId: SEMESTER_ID }]}
          units={[{ id: UNIT_ID, name: 'Unit 1', subjectId: SUBJECT_ID }]}
          canManageLawTypes={true} // Now enabled for Editors
        />
      );

      // Verify that "Law Note" option is present in the select dropdown
      expect(html).toContain('value="LAW_NOTE"');
      expect(html).toContain('Law Note');
    });

    it('allows an Editor to view /admin/study/resources?type=LAW_NOTE without being redirected', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Introduction to Jurisprudence Note',
          type: ResourceType.LAW_NOTE,
          status: ContentStatus.PUBLISHED,
          metaTitle: null,
          isPremium: false,
          priceAmount: null,
          currency: 'NPR',
          semesterId: SEMESTER_ID,
          subjectId: SUBJECT_ID,
          unitId: UNIT_ID,
          documentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { name: 'Editor Amrit', email: 'editor@example.com' },
          createdBy: { name: 'Editor Amrit', email: 'editor@example.com' },
          semester: { id: SEMESTER_ID, name: '1st Semester' },
          subject: { id: SUBJECT_ID, name: 'Jurisprudence' },
          unit: { id: UNIT_ID, name: 'Unit 1' },
        },
      ]);

      const page = await AdminResourcesPage({
        searchParams: Promise.resolve({ type: 'LAW_NOTE' }),
      });

      const html = renderToStaticMarkup(page);

      // Verify page renders with Manage Law Notes heading and Add Law Note button
      expect(html).toContain('Manage Law Notes');
      expect(html).toContain('Add Law Note');
      expect(html).toContain('/admin/study/resources/new?type=LAW_NOTE');
      expect(html).toContain('Introduction to Jurisprudence Note');
    });

    it('allows an Editor to execute createResourceAction for a LAW_NOTE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'editor-1', role: Role.EDITOR });
      mockPrisma.resource.create.mockResolvedValue({
        id: 'new-note-1',
        title: 'New Editor Law Note',
        type: ResourceType.LAW_NOTE,
        status: ContentStatus.PUBLISHED,
      });

      const res = await createResourceAction({
        title: 'New Editor Law Note',
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.resourceId).toBe('new-note-1');
        expect(res.data.url).toBe('/resources/new-note-1');
      }
    });

    it('allows an Editor to execute updateResourceAction for a LAW_NOTE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'editor-1', role: Role.EDITOR });
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: 'note-1',
        type: ResourceType.LAW_NOTE,
        status: ContentStatus.PUBLISHED,
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
      });
      mockPrisma.resource.update.mockResolvedValue({
        id: 'note-1',
        title: 'Updated Editor Law Note',
        type: ResourceType.LAW_NOTE,
        status: ContentStatus.PUBLISHED,
      });

      const res = await updateResourceAction({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Updated Editor Law Note',
        semesterId: SEMESTER_ID,
        subjectId: SUBJECT_ID,
        unitId: UNIT_ID,
        type: ResourceType.LAW_NOTE,
        isPremium: false,
        status: ContentStatus.PUBLISHED,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.url).toBe('/resources/11111111-1111-4111-8111-111111111111');
      }
    });

    it('allows an Editor to publish or unpublish a LAW_NOTE via setResourcePublishedAction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'editor-1', role: Role.EDITOR });
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: 'note-1',
        type: ResourceType.LAW_NOTE,
        status: ContentStatus.DRAFT,
      });
      mockPrisma.resource.update.mockResolvedValue({
        id: 'note-1',
        title: 'Note 1',
        status: ContentStatus.PUBLISHED,
      });

      const res = await setResourcePublishedAction({
        id: '11111111-1111-4111-8111-111111111111',
        published: true,
      });

      expect(res.success).toBe(true);
    });
  });

  describe('2. AdminSidebar RBAC Verification', () => {
    it('renders Law Notes and Resources for both ADMIN and EDITOR', () => {
      const editorHtml = renderToStaticMarkup(<AdminSidebar userRole="EDITOR" />);
      expect(editorHtml).toContain('Law Notes');
      expect(editorHtml).toContain('href="/admin/study/resources?type=LAW_NOTE"');
      expect(editorHtml).toContain('Resources');
      expect(editorHtml).toContain('Case Laws');
      expect(editorHtml).toContain('Editor Portal');
      // Admin-only items should NOT be present for Editor
      expect(editorHtml).not.toContain('Site Settings');
      expect(editorHtml).not.toContain('Protection Center');
      expect(editorHtml).not.toContain('Audit Logs');
      expect(editorHtml).not.toContain('Users &amp; Roles');

      const adminHtml = renderToStaticMarkup(<AdminSidebar userRole="ADMIN" />);
      expect(adminHtml).toContain('Law Notes');
      expect(adminHtml).toContain('Admin Portal');
      expect(adminHtml).toContain('Site Settings');
      expect(adminHtml).toContain('Protection Center');
      expect(adminHtml).toContain('Audit Logs');
      expect(adminHtml).toContain('Users &amp; Roles');
    });
  });

  describe('3. Admin Pages Defense-in-Depth Authentication Check', () => {
    it('redirects unauthenticated users attempting to access /admin/ai, /admin/lawyers, /admin/team', async () => {
      mockSessionUser = null;

      await expect(AdminAiPage()).rejects.toThrow('REDIRECT:/');
      await expect(AdminLawyersPage()).rejects.toThrow('REDIRECT:/');
      await expect(AdminTeamPage()).rejects.toThrow('REDIRECT:/');
    });

    it('redirects regular USER role attempting to access /admin/ai, /admin/lawyers, /admin/team', async () => {
      mockSessionUser = { id: 'user-1', role: Role.USER };

      await expect(AdminAiPage()).rejects.toThrow('REDIRECT:/');
      await expect(AdminLawyersPage()).rejects.toThrow('REDIRECT:/');
      await expect(AdminTeamPage()).rejects.toThrow('REDIRECT:/');
    });

    it('allows EDITOR and ADMIN to access /admin/ai, /admin/lawyers, and /admin/team', async () => {
      mockSessionUser = { id: 'editor-1', role: Role.EDITOR };
      mockPrisma.consultationLawyer.findMany.mockResolvedValue([]);
      mockPrisma.teamMember.findMany.mockResolvedValue([]);

      const aiPage = await AdminAiPage();
      expect(aiPage).toBeDefined();

      const lawyersPage = await AdminLawyersPage();
      expect(lawyersPage).toBeDefined();

      const teamPage = await AdminTeamPage();
      expect(teamPage).toBeDefined();
    });
  });

  describe('4. Comments Moderation RBAC', () => {
    it('allows an EDITOR or ADMIN to delete any comment for moderation', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ userId: 'another-user-99' }]);

      // Regular user cannot delete another user's comment
      const userRes = await deleteComment('comment-1', { id: 'user-2', role: Role.USER });
      expect(userRes).toBe(false);

      // Editor CAN delete another user's comment (moderation)
      const editorRes = await deleteComment('comment-1', { id: 'editor-1', role: Role.EDITOR });
      expect(editorRes).toBe(true);

      // Admin CAN delete another user's comment
      const adminRes = await deleteComment('comment-1', { id: 'admin-1', role: Role.ADMIN });
      expect(adminRes).toBe(true);
    });
  });
});
