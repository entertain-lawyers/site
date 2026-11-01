-- Author attribution for study resources, plus an explicit local-user to
-- WordPress-author mapping per install (WordPress user ids are not local ids).
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "wpAuthorIdEn" INTEGER,
  ADD COLUMN IF NOT EXISTS "wpAuthorIdNe" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "User_wpAuthorIdEn_key" ON "User"("wpAuthorIdEn");
CREATE UNIQUE INDEX IF NOT EXISTS "User_wpAuthorIdNe_key" ON "User"("wpAuthorIdNe");

-- Nullable so every existing resource keeps working unassigned.
ALTER TABLE "Resource"
  ADD COLUMN IF NOT EXISTS "authorId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE INDEX IF NOT EXISTS "Resource_authorId_idx" ON "Resource"("authorId");
CREATE INDEX IF NOT EXISTS "Resource_createdById_idx" ON "Resource"("createdById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_authorId_fkey'
  ) THEN
    ALTER TABLE "Resource"
      ADD CONSTRAINT "Resource_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_createdById_fkey'
  ) THEN
    ALTER TABLE "Resource"
      ADD CONSTRAINT "Resource_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
