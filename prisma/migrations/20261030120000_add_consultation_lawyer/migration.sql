-- CreateTable
CREATE TABLE "ConsultationLawyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Advocate',
    "licenseNumber" TEXT,
    "specialization" TEXT,
    "practiceAreas" TEXT,
    "courtJurisdiction" TEXT,
    "experience" TEXT,
    "qualifications" TEXT,
    "languages" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsappNumber" TEXT,
    "location" TEXT,
    "shortBio" TEXT,
    "bio" TEXT,
    "imageUrl" TEXT,
    "rating" DOUBLE PRECISION DEFAULT 5.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationLawyer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationLawyer_slug_key" ON "ConsultationLawyer"("slug");

-- CreateIndex
CREATE INDEX "ConsultationLawyer_isAvailable_displayOrder_idx" ON "ConsultationLawyer"("isAvailable", "displayOrder");
