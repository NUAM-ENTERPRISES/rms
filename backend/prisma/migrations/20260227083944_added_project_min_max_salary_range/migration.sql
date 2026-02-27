/*
  Warnings:

  - You are about to drop the column `salaryRange` on the `project_roles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "project_roles" DROP COLUMN "salaryRange",
ADD COLUMN     "maxSalaryRange" INTEGER,
ADD COLUMN     "minSalaryRange" INTEGER;
