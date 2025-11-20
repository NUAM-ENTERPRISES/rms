/*
  Warnings:

  - You are about to drop the column `approvedBy` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `approvedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `documentsSubmittedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `documentsVerifiedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `hiredDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `nominatedBy` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `nominatedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedBy` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `selectedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `candidate_project_map` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."candidate_project_map_nominatedBy_idx";

-- DropIndex
DROP INDEX "public"."candidate_project_map_status_idx";

-- AlterTable
ALTER TABLE "candidate_project_map" DROP COLUMN "approvedBy",
DROP COLUMN "approvedDate",
DROP COLUMN "documentsSubmittedDate",
DROP COLUMN "documentsVerifiedDate",
DROP COLUMN "hiredDate",
DROP COLUMN "nominatedBy",
DROP COLUMN "nominatedDate",
DROP COLUMN "rejectedBy",
DROP COLUMN "rejectedDate",
DROP COLUMN "rejectionReason",
DROP COLUMN "selectedDate",
DROP COLUMN "status",
ADD COLUMN     "currentProjectStatusId" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "candidate_project_map_currentProjectStatusId_idx" ON "candidate_project_map"("currentProjectStatusId");

-- CreateIndex
CREATE INDEX "candidate_project_map_recruiterId_idx" ON "candidate_project_map"("recruiterId");

-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_currentProjectStatusId_fkey" FOREIGN KEY ("currentProjectStatusId") REFERENCES "candidate_project_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
