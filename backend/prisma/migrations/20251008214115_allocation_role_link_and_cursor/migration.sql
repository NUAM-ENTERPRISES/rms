/*
  Warnings:

  - A unique constraint covering the columns `[candidateId,projectId,roleNeededId]` on the table `candidate_project_map` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."candidate_project_map_candidateId_projectId_key";

-- AlterTable
ALTER TABLE "public"."candidate_project_map" ADD COLUMN     "roleNeededId" TEXT;

-- CreateTable
CREATE TABLE "public"."allocation_cursors" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleNeededId" TEXT NOT NULL,
    "lastIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allocation_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allocation_cursors_projectId_roleNeededId_key" ON "public"."allocation_cursors"("projectId", "roleNeededId");

-- CreateIndex
CREATE INDEX "candidate_project_map_projectId_roleNeededId_idx" ON "public"."candidate_project_map"("projectId", "roleNeededId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_map_candidateId_projectId_roleNeededId_key" ON "public"."candidate_project_map"("candidateId", "projectId", "roleNeededId");

-- AddForeignKey
ALTER TABLE "public"."candidate_project_map" ADD CONSTRAINT "candidate_project_map_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "public"."roles_needed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
