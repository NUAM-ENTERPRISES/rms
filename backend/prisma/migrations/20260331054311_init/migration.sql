-- AlterTable
ALTER TABLE "processing_steps" ADD COLUMN     "eligibilityDuration" TEXT,
ADD COLUMN     "eligibilityIssuedAt" TIMESTAMP(3),
ADD COLUMN     "eligibilityValidAt" TIMESTAMP(3);
