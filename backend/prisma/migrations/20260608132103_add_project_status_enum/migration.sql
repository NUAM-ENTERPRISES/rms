/*
  Warnings:

  - You are about to alter the column `status` on the `projects` table. The data in that column will be cast from a `String` to a `ProjectStatus`.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('COMPLETED', 'ON_HOLD', 'IN_PROGRESS', 'CANCELLED');

-- AlterTable
UPDATE "projects" SET "status" = 'IN_PROGRESS' WHERE "status" = 'active';
UPDATE "projects" SET "status" = 'CANCELLED' WHERE "status" = 'inactive';
ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "ProjectStatus" USING ("status"::"ProjectStatus");
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
