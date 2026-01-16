-- CreateTable
CREATE TABLE "hrd_reminders" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "hrd_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hrd_reminders_scheduledFor_status_idx" ON "hrd_reminders"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "hrd_reminders_assignedTo_status_idx" ON "hrd_reminders"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "hrd_reminders_processingCandidateId_idx" ON "hrd_reminders"("processingCandidateId");

-- AddForeignKey
ALTER TABLE "hrd_reminders" ADD CONSTRAINT "hrd_reminders_processingStepId_fkey" FOREIGN KEY ("processingStepId") REFERENCES "processing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrd_reminders" ADD CONSTRAINT "hrd_reminders_processingCandidateId_fkey" FOREIGN KEY ("processingCandidateId") REFERENCES "processing_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrd_reminders" ADD CONSTRAINT "hrd_reminders_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
