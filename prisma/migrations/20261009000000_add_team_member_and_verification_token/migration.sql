-- CreateTable
-- `TeamMember` existed in the Prisma schema but was never captured by a
-- migration (it was created with `prisma db push`). The later
-- `add_team_instagram` / `add_team_achievements` migrations ALTER this table,
-- so a fresh `prisma migrate deploy` failed before this point.
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "shortBio" TEXT,
    "biography" TEXT,
    "imageUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "websiteUrl" TEXT,
    "qualifications" TEXT,
    "experience" TEXT,
    "practiceAreas" TEXT,
    "languages" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_slug_key" ON "TeamMember"("slug");

-- CreateIndex
CREATE INDEX "TeamMember_isPublished_displayOrder_idx" ON "TeamMember"("isPublished", "displayOrder");
