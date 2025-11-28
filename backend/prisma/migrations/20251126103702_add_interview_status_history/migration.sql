-- CreateTable
CREATE TABLE "interview_status_history" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT,
    "interviewId" TEXT,
    "interviewType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusSnapshot" TEXT,
    "changedById" TEXT,
    "changedByName" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_status_history_mockInterviewId_idx" ON "interview_status_history"("mockInterviewId");

-- CreateIndex
CREATE INDEX "interview_status_history_interviewId_idx" ON "interview_status_history"("interviewId");

-- CreateIndex
CREATE INDEX "interview_status_history_changedById_idx" ON "interview_status_history"("changedById");

-- CreateIndex
CREATE INDEX "interview_status_history_statusChangedAt_idx" ON "interview_status_history"("statusChangedAt");

-- AddForeignKey
ALTER TABLE "interview_status_history" ADD CONSTRAINT "interview_status_history_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "mock_interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_status_history" ADD CONSTRAINT "interview_status_history_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_status_history" ADD CONSTRAINT "interview_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
