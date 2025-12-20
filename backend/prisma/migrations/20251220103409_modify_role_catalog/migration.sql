/*
  Warnings:

  - You are about to drop the column `role_department_id` on the `role_catalog` table. All the data in the column will be lost.
  - You are about to drop the column `short_name` on the `role_catalog` table. All the data in the column will be lost.
  - You are about to drop the column `short_name` on the `role_departments` table. All the data in the column will be lost.
  - Added the required column `roleDepartmentId` to the `role_catalog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey (if exists)
ALTER TABLE IF EXISTS "public"."role_catalog" DROP CONSTRAINT IF EXISTS "role_catalog_role_department_id_fkey";

-- DropIndex (if exists)
DROP INDEX IF EXISTS "public"."role_catalog_role_department_id_idx";

-- AlterTable - drop old columns if present and add new ones
ALTER TABLE "role_catalog" DROP COLUMN IF EXISTS "role_department_id",
DROP COLUMN IF EXISTS "short_name",
ADD COLUMN     "roleDepartmentId" TEXT NOT NULL,
ADD COLUMN     "shortName" TEXT,
ALTER COLUMN "label" DROP DEFAULT;

-- AlterTable - role_departments
ALTER TABLE "role_departments" DROP COLUMN IF EXISTS "short_name",
ADD COLUMN     IF NOT EXISTS "shortName" TEXT;

-- CreateIndex
CREATE INDEX "role_catalog_roleDepartmentId_idx" ON "role_catalog"("roleDepartmentId");

-- AddForeignKey
ALTER TABLE "role_catalog" ADD CONSTRAINT "role_catalog_roleDepartmentId_fkey" FOREIGN KEY ("roleDepartmentId") REFERENCES "role_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
