-- Extend consultation profiles and intake while retaining existing records.
ALTER TABLE "ConsultationLawyer"
  ADD COLUMN "serviceCities" TEXT,
  ADD COLUMN "lawFirm" TEXT,
  ADD COLUMN "officeAddress" TEXT,
  ADD COLUMN "officeMapUrl" TEXT,
  ADD COLUMN "facebookUrl" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "linkedInUrl" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "achievements" TEXT;

ALTER TABLE "ConsultationRequest"
  ADD COLUMN "whatsappNumber" TEXT,
  ADD COLUMN "permanentAddress" TEXT,
  ADD COLUMN "temporaryAddress" TEXT,
  ADD COLUMN "lawyerId" TEXT;

CREATE INDEX "ConsultationRequest_lawyerId_idx" ON "ConsultationRequest"("lawyerId");

ALTER TABLE "ConsultationRequest"
  ADD CONSTRAINT "ConsultationRequest_lawyerId_fkey"
  FOREIGN KEY ("lawyerId") REFERENCES "ConsultationLawyer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
