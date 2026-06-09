-- CreateTable
CREATE TABLE "candidate_project_status_change_requests" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "requestedStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_project_status_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_project_status_change_requests_candidateProjectMa_idx" ON "candidate_project_status_change_requests"("candidateProjectMapId", "status");

-- CreateIndex
CREATE INDEX "candidate_project_status_change_requests_requestedBy_idx" ON "candidate_project_status_change_requests"("requestedBy");

-- CreateIndex
CREATE INDEX "candidate_project_status_change_requests_status_idx" ON "candidate_project_status_change_requests"("status");

-- AddForeignKey
ALTER TABLE "candidate_project_status_change_requests" ADD CONSTRAINT "candidate_project_status_change_requests_candidateProjectM_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_change_requests" ADD CONSTRAINT "candidate_project_status_change_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_change_requests" ADD CONSTRAINT "candidate_project_status_change_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
