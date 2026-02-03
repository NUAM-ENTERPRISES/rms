-- AlterTable
ALTER TABLE "candidate_project_document_verifications" ADD COLUMN     "isProcessingReplaced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUploadedByProcessingTeam" BOOLEAN NOT NULL DEFAULT false;
