-- AlterTable
ALTER TABLE "processing_steps" ADD COLUMN     "prometricPassedAt" TIMESTAMP(3),
ADD COLUMN     "prometricValidAt" TIMESTAMP(3);
