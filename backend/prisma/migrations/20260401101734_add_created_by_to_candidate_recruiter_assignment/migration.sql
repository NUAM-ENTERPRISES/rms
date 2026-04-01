-- AlterTable
ALTER TABLE "candidate_recruiter_assignments" ADD COLUMN     "createdBy" TEXT;

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_createdBy_idx" ON "candidate_recruiter_assignments"("createdBy");

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
