/*
  Warnings:

  - Added the required column `maxAge` to the `project_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minAge` to the `project_roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "project_roles" ADD COLUMN     "accommodation" BOOLEAN,
ADD COLUMN     "food" BOOLEAN,
ADD COLUMN     "maxAge" INTEGER,
ADD COLUMN     "minAge" INTEGER,
ADD COLUMN     "target" INTEGER,
ADD COLUMN     "transport" BOOLEAN;

-- Backfill reasonable defaults for existing rows so we can make the columns NOT NULL safely
UPDATE "project_roles" SET "minAge" = 18, "maxAge" = 65 WHERE "minAge" IS NULL OR "maxAge" IS NULL;

-- Now enforce NOT NULL constraint
ALTER TABLE "project_roles" ALTER COLUMN "minAge" SET NOT NULL;
ALTER TABLE "project_roles" ALTER COLUMN "maxAge" SET NOT NULL;
