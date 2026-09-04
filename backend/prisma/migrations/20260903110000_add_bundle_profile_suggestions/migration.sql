-- AI-extracted qualifications and work experiences reviewed before apply.
ALTER TABLE "candidate_document_bundles" ADD COLUMN IF NOT EXISTS "profileSuggestions" JSONB;
