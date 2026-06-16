-- AlterTable
ALTER TABLE "users" ADD COLUMN "original_document_intake_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "courier_management_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Sync checkboxes for existing Documents Control Executive users (cosmetic; role permissions remain source of truth)
UPDATE "users" SET
  "original_document_intake_enabled" = true,
  "courier_management_enabled" = true
WHERE "id" IN (
  SELECT ur."userId" FROM "user_roles" ur
  INNER JOIN "roles" r ON r."id" = ur."roleId"
  WHERE r."name" = 'Documents Control Executive'
);
