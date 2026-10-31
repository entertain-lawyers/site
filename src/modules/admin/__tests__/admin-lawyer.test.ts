import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consultationLawyerSchema } from '../admin-lawyer.schema';
import {
  createConsultationLawyerAction,
  updateConsultationLawyerAction,
  deleteConsultationLawyerAction,
  toggleConsultationLawyerAvailabilityAction,
} from '../admin-lawyer.actions';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';
import type { Mock } from 'vitest';

const mock = (fn: unknown) => fn as Mock;
type CreateArgs = { data: Record<string, unknown> };

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        role: where.id === 'admin-1' ? Role.ADMIN : Role.USER,
      })),
    },
    auditLog: { create: vi.fn() },
    consultationLawyer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Admin Consultation Lawyer Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation Schema (consultationLawyerSchema)', () => {
    it('validates a complete lawyer record', () => {
      const valid = {
        name: 'Ram Babu Das',
        title: 'Advocate / Senior Counsel',
        licenseNumber: 'NBC Regd. No. 24890',
        specialization: 'Civil Litigation & Property Law',
        practiceAreas: 'Civil, Commercial, Property',
        courtJurisdiction: 'Supreme Court & High Court',
        experience: '7+ Years',
        qualifications: 'LL.M., B.A. LL.B.',
        phone: '+977 9822010737',
        email: 'baburam.jnk@gmail.com',
        whatsappNumber: '+9779822010737',
        isAvailable: true,
        displayOrder: 1,
      };

      const result = consultationLawyerSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Ram Babu Das');
        expect(result.data.title).toBe('Advocate / Senior Counsel');
      }
    });

    it('rejects missing name', () => {
      const invalid = {
        name: '',
        title: 'Advocate',
      };
      const result = consultationLawyerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createConsultationLawyerAction', () => {
    it('rejects regular users', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'user-1', role: Role.USER } });

      const res = await createConsultationLawyerAction({
        name: 'Advocate Hari',
        title: 'Advocate',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Unauthorized/);
      }
    });

    it('creates new consultation lawyer for ADMIN', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } });
      (prisma.consultationLawyer.findUnique as any).mockResolvedValue(null);
      (prisma.consultationLawyer.create as any).mockResolvedValue({
        id: 'new-lawyer-123',
        name: 'Ram Babu Das',
        slug: 'ram-babu-das',
        title: 'Advocate',
        isAvailable: true,
      });

      const res = await createConsultationLawyerAction({
        name: 'Ram Babu Das',
        title: 'Advocate',
        licenseNumber: 'NBC 24890',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('new-lawyer-123');
        expect(res.data.name).toBe('Ram Babu Das');
      }
      expect(prisma.consultationLawyer.create).toHaveBeenCalled();
    });
  });

  describe('updateConsultationLawyerAction & toggleConsultationLawyerAvailabilityAction', () => {
    it('updates lawyer details for ADMIN', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } });
      (prisma.consultationLawyer.findUnique as any).mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        slug: 'ram-babu-das',
      });
      (prisma.consultationLawyer.update as any).mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Ram Babu Das Updated',
        title: 'Senior Advocate',
      });

      const res = await updateConsultationLawyerAction({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Ram Babu Das Updated',
        title: 'Senior Advocate',
      });

      expect(res.success).toBe(true);
      expect(prisma.consultationLawyer.update).toHaveBeenCalled();
    });

    it('toggles lawyer availability', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } });
      (prisma.consultationLawyer.update as any).mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        isAvailable: false,
      });

      const res = await toggleConsultationLawyerAvailabilityAction({
        id: '11111111-1111-4111-8111-111111111111',
        isAvailable: false,
      });

      expect(res.success).toBe(true);
      expect(prisma.consultationLawyer.update).toHaveBeenCalledWith({
        where: { id: '11111111-1111-4111-8111-111111111111' },
        data: { isAvailable: false },
      });
    });

    it('deletes lawyer profile', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } });
      (prisma.consultationLawyer.delete as any).mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });

      const res = await deleteConsultationLawyerAction({
        id: '11111111-1111-4111-8111-111111111111',
      });

      expect(res.success).toBe(true);
      expect(prisma.consultationLawyer.delete).toHaveBeenCalledWith({
        where: { id: '11111111-1111-4111-8111-111111111111' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'DELETE', entityType: 'CONSULTATION_LAWYER' }),
      });
    });
  });

  describe('slug generation (regression)', () => {
    const uniqueViolation = () =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`slug`)', {
        code: 'P2002',
        clientVersion: 'test',
      });

    beforeEach(() => {
      mock(auth).mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } });
      mock(prisma.consultationLawyer.create).mockImplementation(async ({ data }: CreateArgs) => ({ id: 'l-1', ...data }));
      mock(prisma.consultationLawyer.update).mockImplementation(async ({ data }: CreateArgs) => ({ id: 'l-1', ...data }));
    });

    it('gives a Nepali-script name a real slug instead of an empty one', async () => {
      mock(prisma.consultationLawyer.findFirst).mockResolvedValue(null);

      const res = await createConsultationLawyerAction({ name: 'राम बहादुर थापा', title: 'Advocate' });

      expect(res.success).toBe(true);
      const { data } = mock(prisma.consultationLawyer.create).mock.calls[0][0];
      expect(data.slug).toBe('ram-bahadur-thapa');
      expect(data.name).toBe('राम बहादुर थापा');
    });

    it('normalizes a hand-typed slug', async () => {
      mock(prisma.consultationLawyer.findFirst).mockResolvedValue(null);

      await createConsultationLawyerAction({ name: 'Hari', title: 'Advocate', slug: '  Hari Prasad / Sharma ' });

      const { data } = mock(prisma.consultationLawyer.create).mock.calls[0][0];
      expect(data.slug).toBe('hari-prasad-sharma');
    });

    it('retries with the next suffix when a concurrent create took the slug', async () => {
      // The pre-check sees the slug free, then the insert loses the race.
      mock(prisma.consultationLawyer.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'other' })
        .mockResolvedValueOnce(null);
      mock(prisma.consultationLawyer.create)
        .mockRejectedValueOnce(uniqueViolation())
        .mockImplementationOnce(async ({ data }: CreateArgs) => ({ id: 'l-2', ...data }));

      const res = await createConsultationLawyerAction({ name: 'Ram Babu Das', title: 'Advocate' });

      expect(res.success).toBe(true);
      const calls = mock(prisma.consultationLawyer.create).mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0].data.slug).toBe('ram-babu-das');
      expect(calls[1][0].data.slug).toBe('ram-babu-das-1');
    });

    it('repairs a malformed stored slug on update', async () => {
      mock(prisma.consultationLawyer.findUnique).mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        slug: '-1',
      });
      mock(prisma.consultationLawyer.findFirst).mockResolvedValue(null);

      await updateConsultationLawyerAction({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'सीता शर्मा',
        title: 'Advocate',
      });

      const { data } = mock(prisma.consultationLawyer.update).mock.calls[0][0];
      expect(data.slug).toBe('sita-sharma');
    });

    it('reports a missing profile on delete instead of a generic error', async () => {
      mock(prisma.consultationLawyer.delete).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'test' })
      );

      const res = await deleteConsultationLawyerAction({ id: '11111111-1111-4111-8111-111111111111' });

      expect(res).toEqual({ success: false, error: 'Lawyer profile not found' });
    });
  });
});
