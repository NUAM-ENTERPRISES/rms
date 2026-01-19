-- CreateEnum
CREATE TYPE "PrometricResult" AS ENUM ('PASSED', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "processing_steps" ADD COLUMN     "prometricResult" "PrometricResult";

-- RenameIndex
ALTER INDEX "country_document_requirements_countryCode_docType_step_key" RENAME TO "country_document_requirements_countryCode_docType_processin_key";
