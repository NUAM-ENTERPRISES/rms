-- CreateTable
CREATE TABLE "operations_call_logs" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operations_call_logs_candidateId_loggedAt_idx" ON "operations_call_logs"("candidateId", "loggedAt");

-- CreateIndex
CREATE INDEX "operations_call_logs_assignmentId_loggedAt_idx" ON "operations_call_logs"("assignmentId", "loggedAt");

-- CreateIndex
CREATE INDEX "operations_call_logs_loggedById_idx" ON "operations_call_logs"("loggedById");

-- AddForeignKey
ALTER TABLE "operations_call_logs" ADD CONSTRAINT "operations_call_logs_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_call_logs" ADD CONSTRAINT "operations_call_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "candidate_recruiter_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_call_logs" ADD CONSTRAINT "operations_call_logs_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
