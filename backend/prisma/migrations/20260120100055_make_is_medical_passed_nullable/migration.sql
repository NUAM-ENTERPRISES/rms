-- AlterTable
ALTER TABLE "processing_steps" ALTER COLUMN "isMedicalPassed" DROP NOT NULL,
ALTER COLUMN "isMedicalPassed" DROP DEFAULT;
