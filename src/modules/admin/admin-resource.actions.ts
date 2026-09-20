'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role, ResourceType } from '@prisma/client';

const createResourceSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  subjectId: z.string().uuid(),
  isPremium: z.boolean(),
  priceAmount: z.number().optional(),
  type: z.nativeEnum(ResourceType).optional(),
  unitId: z.string().uuid().optional(),
});

export const createResourceAction = createSafeAction(async (args: {
  title: string;
  description: string;
  subjectId: string;
  isPremium: boolean;
  priceAmount?: number;
  type?: ResourceType;
  unitId?: string;
}, session) => {
  if (session.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  const priceAmount = args.isPremium ? (args.priceAmount || 0) : null;
  const currency = args.isPremium ? 'NPR' : undefined;

  const resource = await prisma.resource.create({
    data: {
      title: args.title,
      subjectId: args.subjectId,
      isPremium: args.isPremium,
      priceAmount,
      currency,
      type: args.type || ResourceType.LAW_NOTE,
      unitId: args.unitId || null,
    }
  });

  return { resourceId: resource.id };
});
