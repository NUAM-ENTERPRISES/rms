/*
  Warnings:

  - You are about to drop the column `mockInterviewId` on the `interview_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `interview_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `statusChangedAt` on the `interview_status_history` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."interview_status_history" DROP CONSTRAINT "interview_status_history_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "public"."interview_status_history" DROP CONSTRAINT "interview_status_history_mockInterviewId_fkey";

-- DropIndex
DROP INDEX "public"."interview_status_history_interviewId_idx";

-- DropIndex
DROP INDEX "public"."interview_status_history_mockInterviewId_idx";

-- DropIndex
DROP INDEX "public"."interview_status_history_statusChangedAt_idx";

-- AlterTable
ALTER TABLE "interview_status_history" DROP COLUMN "mockInterviewId",
DROP COLUMN "notes",
DROP COLUMN "statusChangedAt",
ADD COLUMN     "candidateProjectMapId" TEXT,
ADD COLUMN     "previousStatus" TEXT,
ADD COLUMN     "statusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "interview_status_history_interviewType_interviewId_idx" ON "interview_status_history"("interviewType", "interviewId");

-- CreateIndex
CREATE INDEX "interview_status_history_candidateProjectMapId_idx" ON "interview_status_history"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "interview_status_history_statusAt_idx" ON "interview_status_history"("statusAt");
