/*
  Warnings:

  - A unique constraint covering the columns `[screeningId]` on the table `training_assignments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."training_assignments_screeningId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_screeningId_key" ON "training_assignments"("screeningId");
