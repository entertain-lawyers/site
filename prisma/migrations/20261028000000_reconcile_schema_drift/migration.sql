-- Reconcile schema drift that accumulated because parts of the schema were
-- created with `prisma db push` and never captured in migrations.
--
-- A fresh `prisma migrate deploy` produced a `VerificationToken` table without
-- the `id` / `type` columns that Prisma expects, a `FAQ` table without
-- `language`, and a descending AccessLog index. That made email-verification
-- and password-reset queries fail on any newly provisioned database.

-- VerificationToken: add the columns required by prisma/schema.prisma.
ALTER TABLE "VerificationToken" ADD COLUMN "id" TEXT;
ALTER TABLE "VerificationToken" ADD COLUMN "type" TEXT;

UPDATE "VerificationToken"
SET "id" = gen_random_uuid()::text
WHERE "id" IS NULL;

UPDATE "VerificationToken"
SET "type" = 'email'
WHERE "type" IS NULL;

ALTER TABLE "VerificationToken" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "VerificationToken" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id");

-- The schema only declares the composite (identifier, token) uniqueness.
DROP INDEX IF EXISTS "VerificationToken_token_key";

-- FAQ language column used by the bilingual FAQ screens.
ALTER TABLE "FAQ" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';

-- `updatedAt` is managed by Prisma, not the database.
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Match the index declared in the schema (ascending createdAt).
DROP INDEX IF EXISTS "AccessLog_action_createdAt_idx";
CREATE INDEX "AccessLog_action_createdAt_idx" ON "AccessLog"("action", "createdAt");
