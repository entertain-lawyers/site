-- Profile fields the profile form already collects.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "education" TEXT;
ALTER TABLE "User" ADD COLUMN "university" TEXT;

-- Invalidates existing JWTs when a password is changed or reset.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
