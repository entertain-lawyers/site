'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role, ConsultationStatus, ContactMethod, ConsultationMode, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getClientIp } from '@/lib/client-ip';
import { consultationRequestSchema } from './consultation.schema';

import { sendConsultationNotificationEmail, sendConsultationClientAckEmail } from '@/lib/mail';

async function resolveRequestedLawyer(lawyerId: string | null | undefined): Promise<{ id: string; name: string } | null> {
  const id = lawyerId?.trim();
  if (!id || !z.string().uuid().safeParse(id).success) return null;

  const lawyer = await prisma.consultationLawyer.findFirst({
    where: { id, isAvailable: true },
    select: { id: true, name: true },
  });
  return lawyer ?? null;
}

export const submitConsultationRequestAction = createSafeAction(
  async (data: z.input<typeof consultationRequestSchema>) => {
    // createSafeAction does not validate arguments, so parse here before any
    // raw client input reaches Prisma.
    const parsed = consultationRequestSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid consultation request');
    }
    const input = parsed.data;
    const normalizedEmail = input.email.trim().toLowerCase();

    const headersList = await headers();
    const ip = getClientIp(headersList);
    const userAgent = headersList.get('user-agent') || null;

    // The advocate is resolved from the database by id. The client-supplied
    // name was previously stored and emailed verbatim, so anyone could attach
    // an arbitrary "advocate" (or markup) to a request. An unknown or
    // unavailable advocate falls back to a general chambers request.
    const chosenLawyer = await resolveRequestedLawyer(input.lawyerId);
    const enrichedDescription = chosenLawyer
      ? `[Requested Advocate: ${chosenLawyer.name}]\n\n${input.description.trim()}`
      : input.description.trim();

    const enrichedReferralSource = chosenLawyer
      ? (input.referralSource?.trim() ? `Advocate: ${chosenLawyer.name} | ${input.referralSource.trim()}` : `Advocate: ${chosenLawyer.name}`)
      : (input.referralSource?.trim() || null);

    const request = await prisma.consultationRequest.create({
      data: {
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone.trim(),
        whatsappNumber: input.whatsappNumber.trim(),
        permanentAddress: input.permanentAddress.trim(),
        temporaryAddress: input.temporaryAddress.trim(),
        preferredContactMethod: input.preferredContactMethod as ContactMethod,
        consultationMode: input.consultationMode as ConsultationMode,
        practiceArea: input.practiceArea,
        preferredTime: input.preferredTime?.trim() || null,
        claimAmount: input.claimAmount ?? null,
        courtFeeEstimated: input.courtFeeEstimated ?? null,
        subject: input.subject.trim() || input.description.trim().split(/\r?\n/, 1)[0].slice(0, 200) || 'Consultation Request',
        description: enrichedDescription,
        referralSource: enrichedReferralSource,
        lawyerId: chosenLawyer?.id ?? null,
        ipAddress: ip,
        userAgent: userAgent ? userAgent.substring(0, 255) : null,
      },
    });

    const chambersEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL || 'contact@entertainlawyers.com';

    // The request is already saved; mail is best-effort and must neither fail
    // the submission nor make the visitor wait for two SMTP round-trips.
    const emailJobs = [sendConsultationNotificationEmail({
      recipient: chambersEmail,
      request: {
        id: request.id,
        fullName: request.fullName,
        email: request.email,
        phone: request.phone,
        whatsappNumber: request.whatsappNumber,
        permanentAddress: request.permanentAddress,
        temporaryAddress: request.temporaryAddress,
        preferredContactMethod: request.preferredContactMethod,
        consultationMode: request.consultationMode,
        practiceArea: request.practiceArea,
        preferredTime: request.preferredTime,
        claimAmount: request.claimAmount,
        courtFeeEstimated: request.courtFeeEstimated,
        subject: request.subject,
        description: request.description,
        lawyerName: chosenLawyer?.name ?? null,
        createdAt: request.createdAt,
      },
    })];
    if (normalizedEmail) {
      emailJobs.push(sendConsultationClientAckEmail({
        recipient: normalizedEmail,
        fullName: request.fullName,
        requestId: request.id,
        lawyerName: chosenLawyer?.name ?? null,
      }));
    }
    const emailResults = await Promise.allSettled(emailJobs);
    const chambersResult = emailResults[0];
    const ackResult = emailResults[1];
    if (chambersResult.status === 'rejected') {
      console.error('[Consultation Email Error - Chambers Notification]:', chambersResult.reason);
    }
    if (ackResult?.status === 'rejected') {
      console.error('[Consultation Email Error - Client Acknowledgment]:', ackResult.reason);
    }

    return {
      id: request.id,
      fullName: request.fullName,
      createdAt: request.createdAt,
      lawyerName: chosenLawyer?.name ?? null,
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

    const { status, search, page, pageSize } = adminGetConsultationsFilterSchema.parse(filters);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConsultationRequestWhereInput = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { whatsappNumber: { contains: q, mode: 'insensitive' } },
        { permanentAddress: { contains: q, mode: 'insensitive' } },
        { temporaryAddress: { contains: q, mode: 'insensitive' } },
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
        include: { lawyer: { select: { id: true, name: true, title: true } } },
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
  id: z.string().uuid(),
  status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
  adminNotes: z.string().optional().nullable(),
});

export const adminUpdateConsultationStatusAction = createSafeAction(
  async (data: z.infer<typeof updateStatusSchema>, context) => {
    if (context.role !== Role.ADMIN && context.role !== Role.EDITOR) {
      throw new Error('Unauthorized');
    }

    const parsed = updateStatusSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid consultation update');
    }

    const updated = await prisma.consultationRequest.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status as ConsultationStatus,
        adminNotes: parsed.data.adminNotes !== undefined ? parsed.data.adminNotes : undefined,
      },
    });

    revalidatePath('/admin/consultations');
    return updated;
  },
  { requireAuth: true }
);
