-- Notes written in the admin "Write Note" mode were discarded because the
-- Resource model had nowhere to store them; /read then showed "PDF not
-- available". Store the note body alongside PDF-backed resources.
ALTER TABLE "Resource" ADD COLUMN "content" TEXT;
