-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_subjectId_fkey";

-- AlterTable
ALTER TABLE "Resource" ALTER COLUMN "subjectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

