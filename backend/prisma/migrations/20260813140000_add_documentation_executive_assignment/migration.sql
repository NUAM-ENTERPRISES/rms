-- AlterTable
ALTER TABLE "candidate_projects"
ADD COLUMN "assignedDocumentationExecutiveId" TEXT,
ADD COLUMN "assignedDocumentationAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "candidate_projects_assignedDocumentationExecutiveId_idx"
ON "candidate_projects"("assignedDocumentationExecutiveId");

-- AddForeignKey
ALTER TABLE "candidate_projects"
ADD CONSTRAINT "candidate_projects_assignedDocumentationExecutiveId_fkey"
FOREIGN KEY ("assignedDocumentationExecutiveId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill unassigned verification / client-revision rows round-robin across
-- active Documentation Executives so existing queues are no longer shared.
WITH execs AS (
  SELECT u.id, ROW_NUMBER() OVER (ORDER BY u.id) AS rn
  FROM "users" u
  INNER JOIN "user_roles" ur ON ur."userId" = u.id
  INNER JOIN "roles" r ON r.id = ur."roleId"
  WHERE r.name = 'Documentation Executive'
    AND u.account_status = 'ACTIVE'
),
exec_count AS (
  SELECT COUNT(*)::int AS n FROM execs
),
unassigned AS (
  SELECT cp.id, ROW_NUMBER() OVER (ORDER BY cp."createdAt", cp.id) AS rn
  FROM "candidate_projects" cp
  INNER JOIN "candidate_project_sub_statuses" ss ON ss.id = cp."subStatusId"
  WHERE cp."assignedDocumentationExecutiveId" IS NULL
    AND ss.name IN ('verification_in_progress_document', 'client_revision_requested')
)
UPDATE "candidate_projects" cp
SET
  "assignedDocumentationExecutiveId" = e.id,
  "assignedDocumentationAt" = NOW()
FROM unassigned u
CROSS JOIN exec_count c
INNER JOIN execs e ON e.rn = ((u.rn - 1) % NULLIF(c.n, 0)) + 1
WHERE cp.id = u.id
  AND c.n > 0;
