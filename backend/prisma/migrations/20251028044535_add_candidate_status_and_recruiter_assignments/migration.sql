-- AlterTable
ALTER TABLE "candidates" ALTER COLUMN "currentStatus" SET DEFAULT 'untouched';

-- CreateTable
CREATE TABLE "candidate_recruiter_assignments" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "unassignedBy" TEXT,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_recruiter_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_candidateId_idx" ON "candidate_recruiter_assignments"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_recruiterId_idx" ON "candidate_recruiter_assignments"("recruiterId");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_isActive_idx" ON "candidate_recruiter_assignments"("isActive");

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_unassignedBy_fkey" FOREIGN KEY ("unassignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
