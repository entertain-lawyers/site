'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role, ConsultationStatus, ContactMethod, ConsultationMode } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export const consultationRequestSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number').max(20),
  preferredContactMethod: z.enum(['PHONE', 'EMAIL', 'WHATSAPP']).default('PHONE'),
  consultationMode: z.enum(['PHYSICAL', 'ONLINE', 'EITHER']).default('PHYSICAL'),
  practiceArea: z.string().min(1, 'Please select a legal area'),
  preferredTime: z.string().max(100).optional().nullable(),
  claimAmount: z.number().nonnegative().optional().nullable(),
  courtFeeEstimated: z.number().nonnegative().optional().nullable(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().min(10, 'Please provide details of your legal matter (at least 10 characters)').max(5000),
  referralSource: z.string().max(100).optional().nullable(),
});

export const submitConsultationRequestAction = createSafeAction(
  async (data: z.infer<typeof consultationRequestSchema>) => {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;

    const request = await prisma.consultationRequest.create({
      data: {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        preferredContactMethod: data.preferredContactMethod as ContactMethod,
        consultationMode: data.consultationMode as ConsultationMode,
        practiceArea: data.practiceArea,
        preferredTime: data.preferredTime?.trim() || null,
        claimAmount: data.claimAmount ?? null,
        courtFeeEstimated: data.courtFeeEstimated ?? null,
        subject: data.subject.trim(),
        description: data.description.trim(),
        referralSource: data.referralSource?.trim() || null,
        ipAddress: ip,
        userAgent: userAgent ? userAgent.substring(0, 255) : null,
      },
    });

    return {
      id: request.id,
      fullName: request.fullName,
      createdAt: request.createdAt,
    };
  },
  {
    rateLimitKey: 'consultation_submit',
    rateLimitMax: 5,
    rateLimitWindow: 300, // 5 submissions per 5 minutes per IP
  }
);

// Admin Queries & Actions
const adminGetConsultationsFilterSchema = z.object({
  status: z.enum(['ALL', 'NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).default('ALL'),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const adminGetConsultationsAction = createSafeAction(
  async (filters: z.infer<typeof adminGetConsultationsFilterSchema>, context) => {
    if (context.role !== Role.ADMIN && context.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

    const { status, search, page, pageSize } = filters;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total, countsByStatus] = await Promise.all([
      prisma.consultationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.consultationRequest.count({ where }),
      prisma.consultationRequest.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      SCHEDULED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const group of countsByStatus) {
      statusCounts[group.status] = group._count.status;
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      statusCounts,
    };
  },
  { requireAuth: true }
);

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
  adminNotes: z.string().optional().nullable(),
});

export const adminUpdateConsultationStatusAction = createSafeAction(
  async (data: z.infer<typeof updateStatusSchema>, context) => {
    if (context.role !== Role.ADMIN && context.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

    const updated = await prisma.consultationRequest.update({
      where: { id: data.id },
      data: {
        status: data.status as ConsultationStatus,
        adminNotes: data.adminNotes !== undefined ? data.adminNotes : undefined,
      },
    });

    revalidatePath('/admin/consultations');
    return updated;
  },
  { requireAuth: true }
);
