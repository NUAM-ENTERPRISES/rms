-- AlterTable
ALTER TABLE "candidate_recruiter_assignments"
ADD COLUMN "operationsFollowUpStage" TEXT NOT NULL DEFAULT 'initial',
ADD COLUMN "operationsCallAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "operationsLastCallAt" TIMESTAMP(3),
ADD COLUMN "operationsStageEnteredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_operationsFollowUpStage_idx" ON "candidate_recruiter_assignments"("operationsFollowUpStage");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_recruiterId_isActive_operati_idx" ON "candidate_recruiter_assignments"("recruiterId", "isActive", "operationsFollowUpStage");
