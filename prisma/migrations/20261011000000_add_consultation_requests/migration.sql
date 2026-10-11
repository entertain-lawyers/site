-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('PHYSICAL', 'ONLINE', 'EITHER');

-- CreateTable
CREATE TABLE "ConsultationRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredContactMethod" "ContactMethod" NOT NULL DEFAULT 'PHONE',
    "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'PHYSICAL',
    "practiceArea" TEXT NOT NULL,
    "preferredTime" TEXT,
    "claimAmount" DOUBLE PRECISION,
    "courtFeeEstimated" DOUBLE PRECISION,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referralSource" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationRequest_status_createdAt_idx" ON "ConsultationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationRequest_email_idx" ON "ConsultationRequest"("email");

-- CreateIndex
CREATE INDEX "ConsultationRequest_phone_idx" ON "ConsultationRequest"("phone");
