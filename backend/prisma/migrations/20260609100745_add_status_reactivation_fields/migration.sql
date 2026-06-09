-- AlterTable
ALTER TABLE "candidate_project_status_change_requests" ADD COLUMN     "requestType" TEXT NOT NULL DEFAULT 'block';

-- AlterTable
ALTER TABLE "candidate_projects" ADD COLUMN     "previousMainStatusId" TEXT,
ADD COLUMN     "previousSubStatusId" TEXT,
ADD COLUMN     "statusBlockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "candidate_project_status_change_requests_requestType_idx" ON "candidate_project_status_change_requests"("requestType");

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_previousMainStatusId_fkey" FOREIGN KEY ("previousMainStatusId") REFERENCES "candidate_project_main_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_previousSubStatusId_fkey" FOREIGN KEY ("previousSubStatusId") REFERENCES "candidate_project_sub_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
