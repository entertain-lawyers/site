import { prisma } from "@/lib/prisma";

/**
 * Core Access Control Policy (RBAC)
 *
 * 1. LAW_NOTE, CASE_LAW and OLD_QUESTION content is sign-in gated:
 *    anonymous visitors are asked to sign in before the content page is served.
 * 2. Once signed in, RBAC decides content access:
 *    - resource type OTHER is browsable by anyone
 *    - free resources are open to any authenticated user (USER / EDITOR / ADMIN)
 *    - premium resources require an active purchase or subscription entitlement;
 *      EDITOR and ADMIN roles get lifetime access for review and administration.
 */

/** Resource types that require sign-in before the content page is served. */
export const SIGN_IN_GATED_RESOURCE_TYPES = ["LAW_NOTE", "CASE_LAW", "OLD_QUESTION"] as const;

/** Whether a resource type must be gated behind sign-in. */
export function requiresSignIn(resourceType: string): boolean {
  return (SIGN_IN_GATED_RESOURCE_TYPES as readonly string[]).includes(resourceType);
}
export async function canAccessResource(userId: string, resourceId: string): Promise<boolean> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { isPremium: true }
  });

  // 1. If resource doesn't exist, deny access
  if (!resource) return false;

  // 2. Free resources are accessible to any authenticated user
  if (!resource.isPremium) return true;

  // Privileged roles (EDITOR / ADMIN) have lifetime access to all premium resources
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (user?.role === "ADMIN" || user?.role === "EDITOR") return true;

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
