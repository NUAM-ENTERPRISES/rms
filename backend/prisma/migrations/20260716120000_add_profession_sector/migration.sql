CREATE TYPE "ProfessionSector" AS ENUM ('HEALTHCARE', 'NON_HEALTH_CARE');

ALTER TABLE "profession_types"
ADD COLUMN "sector" "ProfessionSector";

UPDATE "profession_types"
SET "sector" = 'HEALTHCARE'
WHERE "name" IN ('nurse', 'doctor', 'technician');
