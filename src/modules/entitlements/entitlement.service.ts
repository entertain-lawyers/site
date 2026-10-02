import { prisma } from "@/lib/prisma";

/**
 * Core Entitlement Evaluation Service
 * Evaluates whether an authenticated user has access to a specific resource.
 */
export async function canAccessResource(userId: string, resourceId: string): Promise<boolean> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { isPremium: true }
  });

  // 1. If resource doesn't exist, deny access
  if (!resource) return false;

  // 2. Free resources are accessible to any authenticated user
  if (!resource.isPremium) return true;

  // 3. Admin users have lifetime access to all premium resources
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (user?.role === "ADMIN") return true;

  const now = new Date();

  // 3. Check for a valid Purchase Entitlement for this specific resource
  const purchaseEntitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      resourceId,
      sourceType: "PURCHASE",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    }
  });

  if (purchaseEntitlement) return true;

  // 4. Check for a valid Subscription Entitlement
  // A valid subscription entitlement grants access to all premium resources.
  const subscriptionEntitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      sourceType: "SUBSCRIPTION",
      subscription: {
        status: "ACTIVE",
        currentPeriodEnd: { gt: now }
      }
    }
  });

  if (subscriptionEntitlement) return true;

  // 5. Otherwise, access is denied
  return false;
}
