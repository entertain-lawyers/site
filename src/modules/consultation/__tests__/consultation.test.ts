import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  consultationRequestSchema,
  submitConsultationRequestAction,
  adminGetConsultationsAction,
  adminUpdateConsultationStatusAction,
} from '../consultation.actions';
import { prisma } from '@/lib/prisma';
import { Role, ConsultationStatus } from '@prisma/client';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '202.70.78.10';
      if (key === 'user-agent') return 'Mozilla/5.0 TestBrowser';
      return null;
    }),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
  })),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      // createSafeAction re-reads the current role from the database.
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        role: where.id === 'admin1' ? 'ADMIN' : 'USER',
      })),
    },
    consultationRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Consultation Request Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation Schema (consultationRequestSchema)', () => {
    it('validates a complete and correct consultation request payload', () => {
      const validPayload = {
        fullName: 'Ram Bahadur Thapa',
        email: 'ram.thapa@example.com',
        phone: '9841234567',
        preferredContactMethod: 'PHONE' as const,
        consultationMode: 'PHYSICAL' as const,
        practiceArea: 'CIVIL_COMMERCIAL',
        preferredTime: 'Morning (10:00 AM - 1:00 PM)',
        claimAmount: 500000,
        courtFeeEstimated: 11500,
        subject: 'Land Partition & Property Dispute',
        description: 'Need legal assistance regarding ancestral land partitioning and court filing in Pokhara.',
        referralSource: 'calculator',
      };

      const result = consultationRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('Ram Bahadur Thapa');
        expect(result.data.claimAmount).toBe(500000);
      }
    });

    it('rejects invalid email address', () => {
      const result = consultationRequestSchema.safeParse({
        fullName: 'Ram Thapa',
        email: 'invalid-email-string',
        phone: '9841234567',
        practiceArea: 'CIVIL_COMMERCIAL',
        subject: 'Title Dispute',
        description: 'Description of the case with sufficient length.',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(true);
      }
    });

    it('rejects too short description or missing subject', () => {
      const result = consultationRequestSchema.safeParse({
        fullName: 'Ram Thapa',
        email: 'ram@example.com',
        phone: '9841234567',
        practiceArea: 'CIVIL_COMMERCIAL',
        subject: '',
        description: 'Too short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('subject');
        expect(paths).toContain('description');
      }
    });
  });

  describe('submitConsultationRequestAction (Public Submission)', () => {
    it('creates consultation request record with normalized inputs', async () => {
      const fakeCreated = {
        id: 'test-consultation-id-123',
        fullName: 'Sita Sharma',
        createdAt: new Date('2026-10-11T12:00:00Z'),
      };
      (prisma.consultationRequest.create as any).mockResolvedValue(fakeCreated);

      const payload = {
        fullName: '  Sita Sharma  ',
        email: 'SITA.sharma@example.COM',
        phone: ' 9801234567 ',
        preferredContactMethod: 'WHATSAPP' as const,
        consultationMode: 'ONLINE' as const,
        practiceArea: 'CORPORATE_ADVISORY',
        preferredTime: 'Afternoon',
        claimAmount: 1000000,
        courtFeeEstimated: 19000,
        subject: 'Shareholders Agreement Review',
        description: 'Review contract and legal compliance for a tech startup.',
        referralSource: 'calculator',
      };

      const result = await submitConsultationRequestAction(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-consultation-id-123');
        expect(result.data.fullName).toBe('Sita Sharma');
      }

      expect(prisma.consultationRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullName: 'Sita Sharma',
          email: 'sita.sharma@example.com',
          phone: '9801234567',
          preferredContactMethod: 'WHATSAPP',
          consultationMode: 'ONLINE',
          claimAmount: 1000000,
          courtFeeEstimated: 19000,
          ipAddress: '202.70.78.10',
          userAgent: 'Mozilla/5.0 TestBrowser',
        }),
      });
    });
  });

  describe('adminGetConsultationsAction & adminUpdateConsultationStatusAction', () => {
    it('rejects unauthenticated or unauthorized users from viewing consultations', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'u1', role: Role.USER } });

      const res = await adminGetConsultationsAction({
        status: 'ALL',
        page: 1,
        pageSize: 10,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Unauthorized/);
      }
    });

    it('allows ADMIN to fetch consultations list with filters and status breakdown', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'admin1', role: Role.ADMIN } });
      const mockItems = [
        {
          id: 'c1',
          fullName: 'Client One',
          email: 'client1@test.com',
          phone: '9811111111',
          status: ConsultationStatus.NEW,
          createdAt: new Date(),
        },
      ];
      (prisma.consultationRequest.findMany as any).mockResolvedValue(mockItems);
      (prisma.consultationRequest.count as any).mockResolvedValue(1);
      (prisma.consultationRequest.groupBy as any).mockResolvedValue([
        { status: ConsultationStatus.NEW, _count: { status: 1 } },
      ]);

      const res = await adminGetConsultationsAction({
        status: 'ALL',
        page: 1,
        pageSize: 10,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.items).toHaveLength(1);
        expect(res.data.total).toBe(1);
        expect(res.data.statusCounts.NEW).toBe(1);
        expect(res.data.statusCounts.CONTACTED).toBe(0);
      }
    });

    it('allows EDITOR or ADMIN to update consultation status and notes', async () => {
      (auth as any).mockResolvedValue({ user: { id: 'admin1', role: Role.ADMIN } });
      const consultationId = '11111111-1111-4111-8111-111111111111';
      const mockUpdated = {
        id: consultationId,
        status: ConsultationStatus.SCHEDULED,
        adminNotes: 'Appointment set for Tuesday 2 PM',
      };
      (prisma.consultationRequest.update as any).mockResolvedValue(mockUpdated);

      const res = await adminUpdateConsultationStatusAction({
        id: consultationId,
        status: 'SCHEDULED',
        adminNotes: 'Appointment set for Tuesday 2 PM',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe(ConsultationStatus.SCHEDULED);
        expect(res.data.adminNotes).toBe('Appointment set for Tuesday 2 PM');
      }
      expect(prisma.consultationRequest.update).toHaveBeenCalledWith({
        where: { id: consultationId },
        data: {
          status: ConsultationStatus.SCHEDULED,
          adminNotes: 'Appointment set for Tuesday 2 PM',
        },
      });
    });
  });
});
