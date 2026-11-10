-- CreateTable
CREATE TABLE "ActLaw" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "documentUrl" TEXT,
    "fileSize" INTEGER,
    "publishDate" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActLaw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActLaw_slug_key" ON "ActLaw"("slug");

-- CreateIndex
CREATE INDEX "ActLaw_category_status_idx" ON "ActLaw"("category", "status");

-- CreateIndex
CREATE INDEX "ActLaw_title_idx" ON "ActLaw"("title");

-- CreateIndex
CREATE INDEX "ActLaw_status_createdAt_idx" ON "ActLaw"("status", "createdAt");
