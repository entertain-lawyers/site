-- AlterTable: Prepare optional dedicated caseCategory column for Resource
-- NOTE: Do NOT apply this migration without explicit approval.
-- The application currently uses zero-migration fallback (persisting in metaTitle)
-- ensuring complete backward and forward compatibility without unapplied migration errors.

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "caseCategory" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_caseCategory_idx" ON "Resource"("caseCategory");
