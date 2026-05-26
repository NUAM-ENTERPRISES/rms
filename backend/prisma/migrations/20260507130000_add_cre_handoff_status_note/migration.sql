-- AlterTable
ALTER TABLE "candidate_recruiter_assignments" ADD COLUMN "creHandoffStatusNote" TEXT;

-- Backfill from CRE handoff status history where reason was stored
UPDATE "candidate_recruiter_assignments" cra
SET "creHandoffStatusNote" = sub.reason
FROM (
  SELECT DISTINCT ON (csh."candidateId")
    csh."candidateId",
    csh.reason
  FROM "candidate_status_history" csh
  INNER JOIN "candidate_recruiter_assignments" a
    ON a."candidateId" = csh."candidateId"
    AND a."assignmentType" = 'cre_reassigned'
    AND a."isActive" = true
  WHERE csh.reason IS NOT NULL
    AND TRIM(csh.reason) <> ''
    AND csh.reason NOT LIKE 'Returned to recruiter%'
    AND csh.reason NOT LIKE 'CRE handoff status (internal%'
  ORDER BY csh."candidateId", csh."statusUpdatedAt" DESC
) sub
WHERE cra."candidateId" = sub."candidateId"
  AND cra."assignmentType" = 'cre_reassigned'
  AND cra."isActive" = true
  AND cra."creHandoffStatusNote" IS NULL;
