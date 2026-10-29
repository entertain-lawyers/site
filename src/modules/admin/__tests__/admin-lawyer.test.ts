import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  consultationLawyerSchema,
  createConsultationLawyerAction,
  updateConsultationLawyerAction,
  deleteConsultationLawyerAction,
  toggleConsultationLawyerAvailabilityAction,
} from '../admin-lawyer.actions';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

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
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        role: where.id === 'admin-1' ? Role.ADMIN : Role.USER,
      })),
    },
    consultationLawyer: {
      findUnique: vi.fn(),
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
    });
  });
});
