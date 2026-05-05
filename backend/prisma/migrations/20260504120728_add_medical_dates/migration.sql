-- AlterTable
ALTER TABLE "processing_steps" ADD COLUMN     "medicalIssuedAt" TIMESTAMP(3),
ADD COLUMN     "medicalValidAt" TIMESTAMP(3);
