-- Rename processing_failed sub-status to processing_cancelled
UPDATE "candidate_project_sub_statuses"
SET "name" = 'processing_cancelled', "label" = 'Processing Cancelled'
WHERE "name" = 'processing_failed';

-- Extend candidate_project_status_change_requests for processing cancel/hold
ALTER TABLE "candidate_project_status_change_requests"
ADD COLUMN IF NOT EXISTS "processingStepId" TEXT,
ADD COLUMN IF NOT EXISTS "stepKey" TEXT,
ADD COLUMN IF NOT EXISTS "processingCandidateId" TEXT;

CREATE INDEX IF NOT EXISTS "candidate_project_status_change_requests_requestType_status_idx"
ON "candidate_project_status_change_requests"("requestType", "status");

ALTER TABLE "candidate_project_status_change_requests"
ADD CONSTRAINT "candidate_project_status_change_requests_processingStepId_fkey"
FOREIGN KEY ("processingStepId") REFERENCES "processing_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "candidate_project_status_change_requests"
ADD CONSTRAINT "candidate_project_status_change_requests_processingCandidateId_fkey"
FOREIGN KEY ("processingCandidateId") REFERENCES "processing_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
