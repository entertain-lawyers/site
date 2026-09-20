-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('LAW_NOTE', 'CASE_LAW', 'OLD_QUESTION', 'OTHER');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "order" INTEGER,
ADD COLUMN     "type" "ResourceType" NOT NULL DEFAULT 'LAW_NOTE',
ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "order" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_subjectId_type_idx" ON "Resource"("subjectId", "type");

-- CreateIndex
CREATE INDEX "Resource_unitId_idx" ON "Resource"("unitId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
