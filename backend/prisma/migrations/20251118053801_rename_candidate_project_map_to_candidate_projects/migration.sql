/*
  Warnings:

  - You are about to drop the `candidate_project_map` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."candidate_project_document_verifications" DROP CONSTRAINT "candidate_project_document_verifications_candidateProjectM_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_map" DROP CONSTRAINT "candidate_project_map_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_map" DROP CONSTRAINT "candidate_project_map_currentProjectStatusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_map" DROP CONSTRAINT "candidate_project_map_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_map" DROP CONSTRAINT "candidate_project_map_recruiterId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_map" DROP CONSTRAINT "candidate_project_map_roleNeededId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_status_history" DROP CONSTRAINT "candidate_project_status_history_candidateProjectMapId_fkey";

-- DropForeignKey
ALTER TABLE "public"."interviews" DROP CONSTRAINT "interviews_candidateProjectMapId_fkey";

-- DropForeignKey
ALTER TABLE "public"."processing" DROP CONSTRAINT "processing_candidateProjectMapId_fkey";

-- DropTable
DROP TABLE "public"."candidate_project_map";

-- CreateTable
CREATE TABLE "candidate_projects" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleNeededId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentProjectStatusId" INTEGER NOT NULL DEFAULT 1,
    "assignedAt" TIMESTAMP(3),
    "recruiterId" TEXT,

    CONSTRAINT "candidate_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_projects_currentProjectStatusId_idx" ON "candidate_projects"("currentProjectStatusId");

-- CreateIndex
CREATE INDEX "candidate_projects_recruiterId_idx" ON "candidate_projects"("recruiterId");

-- CreateIndex
CREATE INDEX "candidate_projects_projectId_roleNeededId_idx" ON "candidate_projects"("projectId", "roleNeededId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_projects_candidateId_projectId_roleNeededId_key" ON "candidate_projects"("candidateId", "projectId", "roleNeededId");

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_currentProjectStatusId_fkey" FOREIGN KEY ("currentProjectStatusId") REFERENCES "candidate_project_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "project_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing" ADD CONSTRAINT "processing_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_candidateProjectM_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
