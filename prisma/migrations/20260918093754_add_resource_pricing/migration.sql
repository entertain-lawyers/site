-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NPR',
ADD COLUMN     "priceAmount" INTEGER;
