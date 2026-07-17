-- Make roleDepartmentId optional and change ON DELETE to SET NULL
ALTER TABLE "role_catalog" DROP CONSTRAINT "role_catalog_roleDepartmentId_fkey";

ALTER TABLE "role_catalog" ALTER COLUMN "roleDepartmentId" DROP NOT NULL;

ALTER TABLE "role_catalog" ADD CONSTRAINT "role_catalog_roleDepartmentId_fkey" FOREIGN KEY ("roleDepartmentId") REFERENCES "role_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add professionTypeId FK
ALTER TABLE "role_catalog" ADD COLUMN "professionTypeId" TEXT;

-- Backfill professionTypeId from legacy type string matching profession_types.name
UPDATE "role_catalog" AS rc
SET "professionTypeId" = pt.id
FROM "profession_types" AS pt
WHERE rc.type = pt.name;

-- Drop legacy type column
ALTER TABLE "role_catalog" DROP COLUMN "type";

-- Index + FK for professionTypeId
CREATE INDEX "role_catalog_professionTypeId_idx" ON "role_catalog"("professionTypeId");

ALTER TABLE "role_catalog" ADD CONSTRAINT "role_catalog_professionTypeId_fkey" FOREIGN KEY ("professionTypeId") REFERENCES "profession_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
