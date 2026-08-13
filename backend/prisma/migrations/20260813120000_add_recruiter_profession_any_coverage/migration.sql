-- CreateEnum
CREATE TYPE "RecruiterProfessionScope" AS ENUM ('HEALTHCARE', 'NON_HEALTH_CARE', 'BOTH');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "recruiter_sector_scope" "RecruiterProfessionScope",
ADD COLUMN "handles_all_professions" BOOLEAN NOT NULL DEFAULT false;

-- Backfill sector scope for existing Recruiter users from their profession rows.
UPDATE "users" u
SET "recruiter_sector_scope" = derived.scope
FROM (
  SELECT
    ups."userId" AS user_id,
    CASE
      WHEN COUNT(DISTINCT pt.sector) FILTER (WHERE pt.sector IS NOT NULL) = 0 THEN NULL
      WHEN BOOL_AND(pt.sector = 'HEALTHCARE') THEN 'HEALTHCARE'::"RecruiterProfessionScope"
      WHEN BOOL_AND(pt.sector = 'NON_HEALTH_CARE') THEN 'NON_HEALTH_CARE'::"RecruiterProfessionScope"
      ELSE 'BOTH'::"RecruiterProfessionScope"
    END AS scope
  FROM "user_profession_scopes" ups
  INNER JOIN "profession_types" pt ON pt.id = ups."professionTypeId"
  GROUP BY ups."userId"
) derived
WHERE u.id = derived.user_id
  AND derived.scope IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "user_roles" ur
    INNER JOIN "roles" r ON r.id = ur."roleId"
    WHERE ur."userId" = u.id
      AND r.name = 'Recruiter'
  );
