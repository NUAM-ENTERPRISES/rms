/*
  Warnings:

  - Added the required column `roleNeededId` to the `candidate_project_document_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "candidate_project_document_verifications" ADD COLUMN     "roleNeededId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_roleNeededId_idx" ON "candidate_project_document_verifications"("roleNeededId");

-- AddForeignKey
ALTER TABLE "candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "project_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
