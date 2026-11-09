import { z } from 'zod';

const intakePhone = (label: string) => z.string().trim().min(7, `Please enter a valid ${label}`).max(25)
  .regex(/^\+?[\d\s().-]+$/, `Please enter a valid ${label}`)
  .refine((value) => value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15, `Please enter a valid ${label}`);

/**
 * Kept out of the `'use server'` action module: Next.js only allows async
 * function exports from those files, and the form/tests import this schema.
 */
export const consultationRequestSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.union([z.string().email('Please enter a valid email address'), z.literal('')]).optional().default(''),
  phone: intakePhone('phone number'),
  whatsappNumber: intakePhone('WhatsApp number'),
  permanentAddress: z.string().trim().min(3, 'Please enter your permanent address').max(300),
  temporaryAddress: z.string().trim().min(3, 'Please enter your temporary address').max(300),
  preferredContactMethod: z.enum(['PHONE', 'EMAIL', 'WHATSAPP']).default('PHONE'),
  consultationMode: z.enum(['PHYSICAL', 'ONLINE', 'EITHER']).default('PHYSICAL'),
  practiceArea: z.string().min(1, 'Please select a legal area'),
  preferredTime: z.string().max(100).optional().nullable(),
  claimAmount: z.number().nonnegative().optional().nullable(),
  courtFeeEstimated: z.number().nonnegative().optional().nullable(),
  subject: z.string().max(200).optional().default(''),
  description: z.string().trim().min(10, 'Please provide details of your legal matter (at least 10 characters)').max(5000),
  referralSource: z.string().max(100).optional().nullable(),
  lawyerName: z.string().max(150).optional().nullable(),
  lawyerId: z.string().uuid().optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.preferredContactMethod === 'EMAIL' && !value.email) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter an email address to use email as your contact method' });
  }
});
