/*
  Warnings:

  - You are about to drop the column `roleCatalogId` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `roleCatalogId` on the `screenings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."interviews" DROP CONSTRAINT "interviews_roleCatalogId_fkey";

-- DropForeignKey
ALTER TABLE "public"."screenings" DROP CONSTRAINT "screenings_roleCatalogId_fkey";

-- DropIndex
DROP INDEX "public"."interviews_roleCatalogId_idx";

-- DropIndex
DROP INDEX "public"."screenings_roleCatalogId_idx";

-- AlterTable
ALTER TABLE "interviews" DROP COLUMN "roleCatalogId";

-- AlterTable
ALTER TABLE "screenings" DROP COLUMN "roleCatalogId";
