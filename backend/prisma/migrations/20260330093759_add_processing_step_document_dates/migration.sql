-- Migration: add receivedAt field to candidate_project_document_verifications

ALTER TABLE "candidate_project_document_verifications"
  ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
