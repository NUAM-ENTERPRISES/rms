/*
  Warnings:

  - You are about to drop the column `roleNeededId` on the `candidate_project_document_verifications` table. All the data in the column will be lost.
  - Added the required column `roleCatalogId` to the `candidate_project_document_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."candidate_project_document_verifications" DROP CONSTRAINT "candidate_project_document_verifications_roleNeededId_fkey";

-- DropIndex
DROP INDEX "public"."candidate_project_document_verifications_roleNeededId_idx";

-- AlterTable
ALTER TABLE "candidate_project_document_verifications" DROP COLUMN "roleNeededId",
ADD COLUMN     "roleCatalogId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_roleCatalogId_idx" ON "candidate_project_document_verifications"("roleCatalogId");

-- AddForeignKey
ALTER TABLE "candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
