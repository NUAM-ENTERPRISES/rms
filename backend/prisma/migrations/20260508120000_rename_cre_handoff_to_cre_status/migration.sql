-- Rename CRE assignment columns (remove "handoff" naming)
ALTER TABLE "candidate_recruiter_assignments" RENAME COLUMN "creHandoffStatusId" TO "creStatusId";
ALTER TABLE "candidate_recruiter_assignments" RENAME COLUMN "creHandoffStatusNote" TO "creStatusNote";

ALTER TABLE "candidate_recruiter_assignments"
  RENAME CONSTRAINT "candidate_recruiter_assignments_creHandoffStatusId_fkey"
  TO "candidate_recruiter_assignments_creStatusId_fkey";
