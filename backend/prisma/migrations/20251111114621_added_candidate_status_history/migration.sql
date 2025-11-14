-- CreateTable
CREATE TABLE "candidate_status_history" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "statusId" INTEGER NOT NULL,
    "statusNameSnapshot" TEXT NOT NULL,
    "notificationCount" INTEGER NOT NULL DEFAULT 0,
    "lastNotifiedAt" TIMESTAMP(3),
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_status_history_candidateId_idx" ON "candidate_status_history"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_status_history_changedById_idx" ON "candidate_status_history"("changedById");

-- AddForeignKey
ALTER TABLE "candidate_status_history" ADD CONSTRAINT "candidate_status_history_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_status_history" ADD CONSTRAINT "candidate_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_status_history" ADD CONSTRAINT "candidate_status_history_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "candidate_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
