/*
  Warnings:

  - You are about to drop the `data_flow_reminders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hrd_reminders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."data_flow_reminders" DROP CONSTRAINT "data_flow_reminders_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "public"."data_flow_reminders" DROP CONSTRAINT "data_flow_reminders_processingCandidateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."data_flow_reminders" DROP CONSTRAINT "data_flow_reminders_processingStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."hrd_reminders" DROP CONSTRAINT "hrd_reminders_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "public"."hrd_reminders" DROP CONSTRAINT "hrd_reminders_processingCandidateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."hrd_reminders" DROP CONSTRAINT "hrd_reminders_processingStepId_fkey";

-- DropTable
DROP TABLE "public"."data_flow_reminders";

-- DropTable
DROP TABLE "public"."hrd_reminders";

-- CreateTable
CREATE TABLE "processing_step_reminders" (
    "id" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "processingStepId" TEXT NOT NULL,
    "processingCandidateId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "dailyCount" INTEGER NOT NULL DEFAULT 0,
    "daysCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastReminderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_step_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processing_step_reminders_scheduledFor_status_idx" ON "processing_step_reminders"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "processing_step_reminders_assignedTo_status_idx" ON "processing_step_reminders"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "processing_step_reminders_processingCandidateId_idx" ON "processing_step_reminders"("processingCandidateId");

-- CreateIndex
CREATE INDEX "processing_step_reminders_stepKey_idx" ON "processing_step_reminders"("stepKey");

-- AddForeignKey
ALTER TABLE "processing_step_reminders" ADD CONSTRAINT "processing_step_reminders_processingStepId_fkey" FOREIGN KEY ("processingStepId") REFERENCES "processing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_reminders" ADD CONSTRAINT "processing_step_reminders_processingCandidateId_fkey" FOREIGN KEY ("processingCandidateId") REFERENCES "processing_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_reminders" ADD CONSTRAINT "processing_step_reminders_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
