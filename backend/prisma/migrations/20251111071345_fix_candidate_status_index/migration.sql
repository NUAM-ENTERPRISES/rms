/*
  Warnings:

  - You are about to drop the column `currentStatus` on the `candidates` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."candidates_currentStatus_idx";

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "currentStatus",
ADD COLUMN     "currentStatusId" INTEGER;

-- CreateIndex
CREATE INDEX "candidates_currentStatusId_idx" ON "candidates"("currentStatusId");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "candidate_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;
