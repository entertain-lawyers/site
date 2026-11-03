-- Add featuredImage, featuredImageId, createdAt, and updatedAt to Resource
ALTER TABLE "Resource"
  ADD COLUMN IF NOT EXISTS "featuredImage" TEXT,
  ADD COLUMN IF NOT EXISTS "featuredImageId" INTEGER,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Resource_updatedAt_idx" ON "Resource"("updatedAt");
