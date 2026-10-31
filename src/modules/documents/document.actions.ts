"use server";

import { createSafeAction, UserFacingError } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { canAccessResource } from "@/modules/entitlements/entitlement.service";
import { generatePresignedGetUrl } from "@/lib/b2";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { headers } from "next/headers";
import { z } from "zod";

const getDocumentSchema = z.object({
  resourceId: z.string().uuid(),
});

export const getSecureDocumentUrl = createSafeAction(
  async ({ resourceId }: { resourceId: string }, { userId }) => {
    if (!userId) throw new Error("Unauthorized");

    const parsed = getDocumentSchema.safeParse({ resourceId });
    if (!parsed.success) {
      throw new Error("Invalid resource ID");
    }

    // 1. Scoped Rate Limiting
    const headersList = await headers();
    const ip = getClientIp(headersList);

    // IP-based abuse limiter (10 per minute per IP globally for this action)
    const ipLimit = await rateLimit(`doc_abuse_${ip}`, 10, 60);
    if (!ipLimit.success) {
      throw new Error("Too many requests. Please try again later.");
    }

    // Scoped User+Resource rate limiter (prevent hammering specific document)
    const scopedLimit = await rateLimit(`doc_access:${userId}:${resourceId}`, 5, 60);
    if (!scopedLimit.success) {
      throw new Error("Too many requests for this document. Please wait a moment.");
    }

    // 2. Resource Resolution
    // Draft/archived resources must not be readable by guessing their UUID:
    // the public pages only serve PUBLISHED resources, and the document action
    // is reachable directly.
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { document: true }
    });

    if (!resource || resource.status !== 'PUBLISHED') {
      throw new Error("Resource not found");
    }

    // 3. Entitlement Check
    const hasAccess = await canAccessResource(userId, resourceId);
    if (!hasAccess) {
      throw new Error("You do not have access to this premium resource. Please purchase it or subscribe to a plan.");
    }

    if (!resource.document) {
      throw new UserFacingError("This resource does not have an associated document.");
    }

    // 4. Generate short-lived Signed URL (5 minutes)
    const signedUrl = await generatePresignedGetUrl(resource.document.storageKey, 300);

    // 5. Access Logging
    await prisma.accessLog.create({
      data: {
        userId,
        resourceId,
        documentId: resource.document.id,
        action: "VIEW_DOCUMENT",
        ipAddress: ip,
        userAgent: headersList.get("user-agent") ?? "unknown",
      }
    });

    return signedUrl;
  },
  {
    requireAuth: true,
  }
);
