-- CreateTable
CREATE TABLE "candidate_project_status_history" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "projectStatusId" INTEGER NOT NULL,
    "statusNameSnapshot" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_project_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_project_status_history_candidateProjectMapId_idx" ON "candidate_project_status_history"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "candidate_project_status_history_changedById_idx" ON "candidate_project_status_history"("changedById");

-- CreateIndex
CREATE INDEX "candidate_project_status_history_projectStatusId_idx" ON "candidate_project_status_history"("projectStatusId");

-- CreateIndex
CREATE INDEX "candidate_project_status_history_statusChangedAt_idx" ON "candidate_project_status_history"("statusChangedAt");

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_projectStatusId_fkey" FOREIGN KEY ("projectStatusId") REFERENCES "candidate_project_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
