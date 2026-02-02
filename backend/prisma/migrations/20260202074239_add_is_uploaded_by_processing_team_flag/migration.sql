-- CreateEnum
CREATE TYPE "PrometricResult" AS ENUM ('PASSED', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "candidate_project_document_verifications" ADD COLUMN     "isUploadedByProcessingTeam" BOOLEAN NOT NULL DEFAULT false;
