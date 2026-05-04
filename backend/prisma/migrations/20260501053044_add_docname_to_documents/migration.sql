-- Add human-friendly document display name
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "docName" TEXT;

-- Helpful for searching/filtering by docName
CREATE INDEX IF NOT EXISTS "documents_docName_idx" ON "documents"("docName");

