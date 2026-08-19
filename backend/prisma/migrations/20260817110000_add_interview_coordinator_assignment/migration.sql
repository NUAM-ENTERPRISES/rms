-- AlterTable
ALTER TABLE "candidate_projects"
ADD COLUMN "assignedInterviewCoordinatorId" TEXT,
ADD COLUMN "assignedInterviewCoordinatorAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "candidate_projects_assignedInterviewCoordinatorId_idx"
ON "candidate_projects"("assignedInterviewCoordinatorId");

-- AddForeignKey
ALTER TABLE "candidate_projects"
ADD CONSTRAINT "candidate_projects_assignedInterviewCoordinatorId_fkey"
FOREIGN KEY ("assignedInterviewCoordinatorId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Prefer existing Screening.coordinatorId when CPM assignee is null
UPDATE "candidate_projects" cp
SET
  "assignedInterviewCoordinatorId" = s."coordinatorId",
  "assignedInterviewCoordinatorAt" = COALESCE(s."createdAt", NOW())
FROM (
  SELECT DISTINCT ON ("candidateProjectMapId")
    "candidateProjectMapId",
    "coordinatorId",
    "createdAt"
  FROM "screenings"
  WHERE "coordinatorId" IS NOT NULL
  ORDER BY "candidateProjectMapId", "createdAt" ASC
) s
WHERE cp.id = s."candidateProjectMapId"
  AND cp."assignedInterviewCoordinatorId" IS NULL;

-- Backfill remaining unassigned IC-queue rows round-robin across
-- active Interview Coordinators so existing queues are no longer shared.
WITH coords AS (
  SELECT u.id, ROW_NUMBER() OVER (ORDER BY u.id) AS rn
  FROM "users" u
  INNER JOIN "user_roles" ur ON ur."userId" = u.id
  INNER JOIN "roles" r ON r.id = ur."roleId"
  WHERE r.name = 'Interview Coordinator'
    AND u.account_status = 'ACTIVE'
),
coord_count AS (
  SELECT COUNT(*)::int AS n FROM coords
),
unassigned AS (
  SELECT cp.id, ROW_NUMBER() OVER (ORDER BY cp."createdAt", cp.id) AS rn
  FROM "candidate_projects" cp
  INNER JOIN "candidate_project_sub_statuses" ss ON ss.id = cp."subStatusId"
  WHERE cp."assignedInterviewCoordinatorId" IS NULL
    AND ss.name IN (
      'submitted_to_client',
      'shortlisted',
      'not_shortlisted',
      'interview_assigned',
      'interview_scheduled',
      'interview_rescheduled',
      'interview_completed',
      'interview_passed',
      'interview_failed',
      'interview_backout',
      'interview_selected',
      'screening_assigned',
      'screening_scheduled',
      'screening_completed',
      'screening_passed',
      'screening_failed',
      'screening_needs_training',
      'screening_on_hold',
      'training_assigned',
      'training_scheduled',
      'training_in_progress',
      'training_completed',
      'ready_for_reassessment'
    )
)
UPDATE "candidate_projects" cp
SET
  "assignedInterviewCoordinatorId" = c.id,
  "assignedInterviewCoordinatorAt" = NOW()
FROM unassigned u
CROSS JOIN coord_count cc
INNER JOIN coords c ON c.rn = ((u.rn - 1) % NULLIF(cc.n, 0)) + 1
WHERE cp.id = u.id
  AND cc.n > 0;
