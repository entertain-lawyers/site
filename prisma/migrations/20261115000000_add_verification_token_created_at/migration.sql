-- Add creation timestamp to VerificationToken, used to enforce the 60-second
-- resend cooldown between email verification codes. Existing rows backfill
-- with the migration timestamp, which is older than any cooldown window.
ALTER TABLE "VerificationToken" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
