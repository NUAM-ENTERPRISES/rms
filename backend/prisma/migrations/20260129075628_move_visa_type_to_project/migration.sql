/*
  Warnings:

  - You are about to drop the column `visaType` on the `project_roles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "project_roles" DROP COLUMN "visaType";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "visaType" TEXT NOT NULL DEFAULT 'direct_visa';
