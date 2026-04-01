/*
  Warnings:

  - You are about to drop the column `futureDate` on the `candidate_status_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidate_status_history" DROP COLUMN "futureDate";

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "onHoldDuration" INTEGER DEFAULT 0,
ADD COLUMN     "onHoldUntil" TIMESTAMP(3);
