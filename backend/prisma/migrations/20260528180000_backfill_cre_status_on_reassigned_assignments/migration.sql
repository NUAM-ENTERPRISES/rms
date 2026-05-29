-- Backfill creStatusId on cre_reassigned assignments from CRE handoff status history
UPDATE "candidate_recruiter_assignments" cra
SET "creStatusId" = sub."statusId"
FROM (
  SELECT DISTINCT ON (csh."candidateId")
    csh."candidateId",
    csh."statusId"
  FROM "candidate_status_history" csh
  INNER JOIN "candidate_recruiter_assignments" a
    ON a."candidateId" = csh."candidateId"
    AND a."assignmentType" = 'cre_reassigned'
    AND a."isActive" = true
  WHERE csh.reason IS NOT NULL
    AND TRIM(csh.reason) <> ''
    AND csh.reason NOT LIKE 'Returned to recruiter pipeline as untouched after CRE reassign%'
  ORDER BY csh."candidateId", csh."statusUpdatedAt" DESC
) sub
WHERE cra."candidateId" = sub."candidateId"
  AND cra."assignmentType" = 'cre_reassigned'
  AND cra."isActive" = true
  AND cra."creStatusId" IS NULL;
