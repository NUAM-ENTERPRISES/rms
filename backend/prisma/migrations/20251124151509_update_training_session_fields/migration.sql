/*
  Warnings:

  - You are about to drop the column `attended` on the `training_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `performance` on the `training_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `training_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "training_sessions" DROP COLUMN "attended",
DROP COLUMN "performance",
DROP COLUMN "topic",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "performanceRating" TEXT,
ADD COLUMN     "plannedActivities" TEXT,
ADD COLUMN     "sessionType" TEXT NOT NULL DEFAULT 'video',
ADD COLUMN     "topicsCovered" JSON;

-- CreateIndex
CREATE INDEX "training_sessions_completedAt_idx" ON "training_sessions"("completedAt");
