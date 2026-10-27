-- Visual builder (Puck) pages for the admin /admin/pages editor and the
-- public /p/[slug] renderer, plus the AccessLog.url column used by the
-- copy-protection activity feed and first-party page-view analytics.

-- CreateTable
CREATE TABLE "BuilderPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuilderPage_slug_key" ON "BuilderPage"("slug");

-- AddForeignKey
ALTER TABLE "BuilderPage" ADD CONSTRAINT "BuilderPage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: source-page column for protection events and first-party analytics
ALTER TABLE "AccessLog" ADD COLUMN "url" TEXT;

-- CreateIndex
CREATE INDEX "AccessLog_action_createdAt_idx" ON "AccessLog"("action", "createdAt" DESC);
