/*
  Warnings:

  - You are about to drop the column `documentId` on the `processing_step_documents` table. All the data in the column will be lost.
  - Added the required column `candidateProjectDocumentVerificationId` to the `processing_step_documents` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."processing_step_documents" DROP CONSTRAINT "processing_step_documents_documentId_fkey";

-- DropIndex
DROP INDEX "public"."processing_step_documents_documentId_idx";

-- AlterTable
ALTER TABLE "processing_step_documents" DROP COLUMN "documentId",
ADD COLUMN     "candidateProjectDocumentVerificationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "processing_step_documents_candidateProjectDocumentVerificat_idx" ON "processing_step_documents"("candidateProjectDocumentVerificationId");

-- AddForeignKey
ALTER TABLE "processing_step_documents" ADD CONSTRAINT "processing_step_documents_candidateProjectDocumentVerifica_fkey" FOREIGN KEY ("candidateProjectDocumentVerificationId") REFERENCES "candidate_project_document_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
