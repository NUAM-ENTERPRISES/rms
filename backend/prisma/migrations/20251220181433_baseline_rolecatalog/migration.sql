-- Add roleCatalogId to work_experiences (nullable initially)
ALTER TABLE "work_experiences" ADD COLUMN IF NOT EXISTS "roleCatalogId" TEXT;

-- Create index on roleCatalogId
CREATE INDEX IF NOT EXISTS "work_experiences_roleCatalogId_idx" ON "work_experiences"("roleCatalogId");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'work_experiences_roleCatalogId_fkey'
    ) THEN
        ALTER TABLE "work_experiences" 
        ADD CONSTRAINT "work_experiences_roleCatalogId_fkey" 
        FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
