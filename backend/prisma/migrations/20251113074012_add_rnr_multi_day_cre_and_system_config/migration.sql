/*
  Warnings:

  - You are about to drop the column `currentCount` on the `rnr_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `history` on the `rnr_reminders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."rnr_reminders_candidateId_key";

-- AlterTable
ALTER TABLE "candidate_recruiter_assignments" ADD COLUMN     "assignmentType" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "rnr_reminders" DROP COLUMN "currentCount",
DROP COLUMN "history",
ADD COLUMN     "creAssigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creAssignedAt" TIMESTAMP(3),
ADD COLUMN     "creAssignedTo" TEXT,
ADD COLUMN     "daysCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ALTER COLUMN "dailyCount" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_key_idx" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_isActive_idx" ON "system_config"("isActive");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_assignmentType_idx" ON "candidate_recruiter_assignments"("assignmentType");

-- CreateIndex
CREATE INDEX "rnr_reminders_candidateId_idx" ON "rnr_reminders"("candidateId");

-- CreateIndex
CREATE INDEX "rnr_reminders_daysCompleted_status_idx" ON "rnr_reminders"("daysCompleted", "status");
