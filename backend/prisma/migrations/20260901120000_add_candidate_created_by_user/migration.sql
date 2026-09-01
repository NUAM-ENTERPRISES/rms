-- Persist who created a candidate independently of recruiter assignment.

ALTER TABLE "candidates" ADD COLUMN "created_by_user_id" TEXT;

UPDATE "candidates" AS c
SET "created_by_user_id" = src.uid
FROM (
  SELECT DISTINCT ON ("candidateId")
    "candidateId",
    COALESCE("createdBy", "assignedBy") AS uid
  FROM "candidate_recruiter_assignments"
  WHERE COALESCE("createdBy", "assignedBy") IS NOT NULL
  ORDER BY "candidateId", "createdAt" ASC
) AS src
WHERE c.id = src."candidateId"
  AND c."created_by_user_id" IS NULL;

UPDATE "candidates" AS c
SET "created_by_user_id" = src.uid
FROM (
  SELECT DISTINCT ON ("candidateId")
    "candidateId",
    "changedById" AS uid
  FROM "candidate_status_history"
  WHERE "changedById" IS NOT NULL
  ORDER BY "candidateId", "statusUpdatedAt" ASC
) AS src
WHERE c.id = src."candidateId"
  AND c."created_by_user_id" IS NULL;

CREATE INDEX "candidates_created_by_user_id_idx" ON "candidates"("created_by_user_id");

ALTER TABLE "candidates"
  ADD CONSTRAINT "candidates_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
