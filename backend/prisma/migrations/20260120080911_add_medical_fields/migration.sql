-- AlterTable
ALTER TABLE "processing_steps" ADD COLUMN     "isMedicalPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mofaNumber" TEXT;
