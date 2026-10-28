-- WordPress-parity profile fields: Names (first/last/nickname), Contact
-- (website) and About (bio) for the admin user editor. `name` stays the
-- display name; profile photo reuses the existing `image` column.
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "website" TEXT;
