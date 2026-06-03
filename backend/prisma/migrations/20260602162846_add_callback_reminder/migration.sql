-- CreateTable
CREATE TABLE "callback_reminders" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "statusHistoryId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "callback_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "callback_reminders_scheduledFor_status_idx" ON "callback_reminders"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "callback_reminders_recruiterId_status_idx" ON "callback_reminders"("recruiterId", "status");

-- CreateIndex
CREATE INDEX "callback_reminders_candidateId_idx" ON "callback_reminders"("candidateId");

-- AddForeignKey
ALTER TABLE "callback_reminders" ADD CONSTRAINT "callback_reminders_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callback_reminders" ADD CONSTRAINT "callback_reminders_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callback_reminders" ADD CONSTRAINT "callback_reminders_statusHistoryId_fkey" FOREIGN KEY ("statusHistoryId") REFERENCES "candidate_status_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
