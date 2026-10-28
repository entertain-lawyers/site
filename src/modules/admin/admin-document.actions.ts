"use server";

import { createSafeAction } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { generatePresignedPutUrl, getObjectMetadata, getObjectHeadBytes } from "@/lib/b2";
import { z } from "zod";

const initiateUploadSchema = z.object({
  resourceId: z.string().uuid(),
  expectedSize: z.number().positive().max(50 * 1024 * 1024), // Max 50MB
  expectedMimeType: z.enum(["application/pdf"]),
});

async function markUploadIntentFailed(intentId: string) {
  await prisma.uploadIntent.update({
    where: { id: intentId },
    data: { status: "FAILED" }
  });
}

export const initiateDocumentUpload = createSafeAction(
  async ({ resourceId, expectedSize, expectedMimeType }: z.infer<typeof initiateUploadSchema>, { userId, role }) => {
    if (!userId || (role !== "ADMIN" && role !== "EDITOR")) throw new Error("Unauthorized");

    const parsed = initiateUploadSchema.safeParse({ resourceId, expectedSize, expectedMimeType });
    if (!parsed.success) {
      throw new Error("Invalid parameters");
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { document: true }
    });

    if (!resource) {
      throw new Error("Resource not found");
    }

    // Document replacement is fully supported.
    // The previous document and R2 object will be safely retained as an orphaned historical artifact.

    // Generate internal storage key
    const storageKey = `documents/${resourceId}-${Date.now()}.pdf`;

    // Generate the PUT URL (expires in 10 minutes)
    const uploadUrl = await generatePresignedPutUrl(storageKey, expectedMimeType, 600);

    // Create the upload intent
    const intent = await prisma.uploadIntent.create({
      data: {
        resourceId,
        storageKey,
        expectedSize,
        expectedMimeType,
        adminId: userId,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      }
    });

    // Return the intent ID and URL, DO NOT return the storage key
    return {
      uploadIntentId: intent.id,
      uploadUrl,
    };
  }
);

const confirmUploadSchema = z.object({
  resourceId: z.string().uuid(),
  uploadIntentId: z.string().uuid(),
});

export const confirmDocumentUpload = createSafeAction(
  async ({ resourceId, uploadIntentId }: { resourceId: string; uploadIntentId: string }, { userId, role }) => {
    if (!userId || (role !== "ADMIN" && role !== "EDITOR")) throw new Error("Unauthorized");

    const parsed = confirmUploadSchema.safeParse({ resourceId, uploadIntentId });
    if (!parsed.success) {
      throw new Error("Invalid parameters");
    }

    // 1. Retrieve the intent
    const intent = await prisma.uploadIntent.findUnique({
      where: { id: uploadIntentId }
    });

    if (!intent) throw new Error("Upload intent not found");

    // 2. Validate Intent Status & Ownership
    if (intent.status !== "PENDING") {
      throw new Error(`Upload intent is already ${intent.status}`);
    }
    if (intent.resourceId !== resourceId) {
      throw new Error("Intent does not match the provided resource");
    }
    if (intent.adminId !== userId) {
      throw new Error("You are not the admin who initiated this upload");
    }
    if (intent.expiresAt < new Date()) {
      await prisma.uploadIntent.update({
        where: { id: intent.id },
        data: { status: "EXPIRED" }
      });
      throw new Error("Upload intent has expired");
    }

    // 3. Verify B2 object existence and metadata
    let metadata;
    try {
      metadata = await getObjectMetadata(intent.storageKey);
    } catch {
      throw new Error("Failed to verify file upload in storage. The file may not have been uploaded yet.");
    }

    const actualSize = metadata.ContentLength ?? 0;
    const actualMimeType = metadata.ContentType;

    if (actualSize === 0) {
      await markUploadIntentFailed(intent.id);
      throw new Error("Uploaded file is empty");
    }

    if (actualSize !== intent.expectedSize) {
      await markUploadIntentFailed(intent.id);
      throw new Error("Uploaded file size does not match the authorized upload size.");
    }

    if (actualMimeType && actualMimeType !== intent.expectedMimeType) {
      await markUploadIntentFailed(intent.id);
      throw new Error("Uploaded file MIME type does not match the authorized upload type.");
    }

    // 4. Verify Magic Bytes (%PDF-)
    try {
      // '%PDF-' is exactly 5 bytes
      const magicBytes = await getObjectHeadBytes(intent.storageKey, 5);
      if (!magicBytes.startsWith("%PDF-")) {
        await markUploadIntentFailed(intent.id);
        throw new Error("Invalid file content. Expected a valid PDF document.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown PDF verification error";
      throw new Error(`Failed to verify PDF signature: ${message}`);
    }

    // 5. Finalize Document Record
    // Use a transaction to ensure atomic creation and intent confirmation
    const document = await prisma.$transaction(async (tx) => {
      // Compare-and-swap to prevent race conditions (TOCTOU)
      const updateResult = await tx.uploadIntent.updateMany({
        where: { id: intent.id, status: "PENDING" },
        data: { status: "CONFIRMED" }
      });

      if (updateResult.count === 0) {
        throw new Error("Upload intent was already processed by another request.");
      }

      const doc = await tx.document.create({
        data: {
          storageProvider: "B2",
          storageKey: intent.storageKey,
          fileSize: actualSize,
          mimeType: intent.expectedMimeType,
        }
      });

      await tx.resource.update({
        where: { id: resourceId },
        data: { documentId: doc.id }
      });

      return doc;
    });

    return {
      success: true,
      documentId: document.id
    };
  }
);
