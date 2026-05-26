-- AlterTable
ALTER TABLE "candidate_recruiter_assignments" ADD COLUMN "creHandoffStatusId" INTEGER;

-- AddForeignKey
ALTER TABLE "candidate_recruiter_assignments" ADD CONSTRAINT "candidate_recruiter_assignments_creHandoffStatusId_fkey" FOREIGN KEY ("creHandoffStatusId") REFERENCES "candidate_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recruiter pipeline: CRE-reassigned candidates always appear as untouched
UPDATE "candidates" c
SET
  "currentStatusId" = (
    SELECT id FROM "candidate_status"
    WHERE LOWER("statusName") = 'untouched'
    LIMIT 1
  ),
  "onHoldDuration" = NULL,
  "onHoldUntil" = NULL,
  "futureDate" = NULL
WHERE c.id IN (
  SELECT DISTINCT "candidateId"
  FROM "candidate_recruiter_assignments"
  WHERE "assignmentType" = 'cre_reassigned' AND "isActive" = true
);
