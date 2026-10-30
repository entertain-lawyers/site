import { z } from 'zod';

/**
 * Kept out of the `'use server'` action module: Next.js only allows async
 * function exports from those files, and the form/tests import this schema.
 */
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
  lawyerName: z.string().max(150).optional().nullable(),
  lawyerId: z.string().max(100).optional().nullable(),
});
