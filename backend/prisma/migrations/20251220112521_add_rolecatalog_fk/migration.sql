/*
  Warnings:

  - You are about to drop the column `short_name` on the `role_departments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "project_roles" ADD COLUMN     "roleCatalogId" TEXT;


-- CreateIndex
CREATE INDEX "project_roles_roleCatalogId_idx" ON "project_roles"("roleCatalogId");

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
