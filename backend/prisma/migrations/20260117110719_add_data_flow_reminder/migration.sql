-- CreateTable
CREATE TABLE "data_flow_reminders" (
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

    CONSTRAINT "data_flow_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_flow_reminders_scheduledFor_status_idx" ON "data_flow_reminders"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "data_flow_reminders_assignedTo_status_idx" ON "data_flow_reminders"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "data_flow_reminders_processingCandidateId_idx" ON "data_flow_reminders"("processingCandidateId");

-- AddForeignKey
ALTER TABLE "data_flow_reminders" ADD CONSTRAINT "data_flow_reminders_processingStepId_fkey" FOREIGN KEY ("processingStepId") REFERENCES "processing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_flow_reminders" ADD CONSTRAINT "data_flow_reminders_processingCandidateId_fkey" FOREIGN KEY ("processingCandidateId") REFERENCES "processing_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_flow_reminders" ADD CONSTRAINT "data_flow_reminders_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "country_document_requirements_countryCode_docType_step_key" RENAME TO "country_document_requirements_countryCode_docType_processin_key";
