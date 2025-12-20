-- Modify role_catalog to new schema

-- Add new columns
ALTER TABLE "role_catalog" ADD COLUMN IF NOT EXISTS "role_department_id" TEXT;
ALTER TABLE "role_catalog" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "role_catalog" ADD COLUMN IF NOT EXISTS "short_name" TEXT;

-- Drop slug unique index and slug column if present
DROP INDEX IF EXISTS "role_catalog_slug_key";
ALTER TABLE "role_catalog" DROP COLUMN IF EXISTS "slug";

-- Drop category/subCategory/isClinical columns
ALTER TABLE "role_catalog" DROP COLUMN IF EXISTS "category";
ALTER TABLE "role_catalog" DROP COLUMN IF EXISTS "subCategory";
ALTER TABLE "role_catalog" DROP COLUMN IF EXISTS "isClinical";

-- Create index on role_department_id
CREATE INDEX IF NOT EXISTS "role_catalog_role_department_id_idx" ON "role_catalog"("role_department_id");

-- Add foreign key constraint to role_departments and make column NOT NULL
ALTER TABLE "role_catalog" ADD CONSTRAINT "role_catalog_role_department_id_fkey" FOREIGN KEY ("role_department_id") REFERENCES "role_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Ensure existing role_catalog rows have a department: create a default department if missing
-- Insert a default department if missing. Only insert columns that are guaranteed to exist to be resilient
INSERT INTO "role_departments" (id, name, label, "updatedAt")
SELECT 'default-dept', 'General', 'General', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "role_departments" WHERE name = 'General');

UPDATE "role_catalog" SET "role_department_id" = 'default-dept' WHERE "role_department_id" IS NULL;

ALTER TABLE "role_catalog" ALTER COLUMN "role_department_id" SET NOT NULL;
