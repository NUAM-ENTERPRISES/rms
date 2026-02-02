/*
  Warnings:

  - You are about to drop the column `isUploadedByProcessingTeam` on the `candidate_project_document_verifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidate_project_document_verifications" DROP COLUMN "isUploadedByProcessingTeam";
