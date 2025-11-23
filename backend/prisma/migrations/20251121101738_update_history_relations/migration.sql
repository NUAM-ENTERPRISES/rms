/*
  Warnings:

  - You are about to drop the column `projectStatusId` on the `candidate_project_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `statusNameSnapshot` on the `candidate_project_status_history` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."candidate_project_status_history" DROP CONSTRAINT "candidate_project_status_history_projectStatusId_fkey";

-- DropIndex
DROP INDEX "public"."candidate_project_status_history_projectStatusId_idx";

-- AlterTable
ALTER TABLE "candidate_project_status_history" DROP COLUMN "projectStatusId",
DROP COLUMN "statusNameSnapshot",
ADD COLUMN     "mainStatusId" TEXT,
ADD COLUMN     "mainStatusSnapshot" TEXT,
ADD COLUMN     "subStatusId" TEXT,
ADD COLUMN     "subStatusSnapshot" TEXT;

-- AlterTable
ALTER TABLE "candidate_projects" ADD COLUMN     "mainStatusId" TEXT,
ADD COLUMN     "subStatusId" TEXT;

-- CreateTable
CREATE TABLE "candidateProjectMainStatuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidateProjectMainStatuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidateProjectSubStatuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL,
    "icon" TEXT,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidateProjectSubStatuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidateProjectMainStatuses_name_key" ON "candidateProjectMainStatuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "candidateProjectSubStatuses_name_key" ON "candidateProjectSubStatuses"("name");

-- CreateIndex
CREATE INDEX "candidate_project_status_history_mainStatusId_idx" ON "candidate_project_status_history"("mainStatusId");

-- CreateIndex
CREATE INDEX "candidate_project_status_history_subStatusId_idx" ON "candidate_project_status_history"("subStatusId");

-- CreateIndex
CREATE INDEX "candidate_projects_mainStatusId_idx" ON "candidate_projects"("mainStatusId");

-- CreateIndex
CREATE INDEX "candidate_projects_subStatusId_idx" ON "candidate_projects"("subStatusId");

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_mainStatusId_fkey" FOREIGN KEY ("mainStatusId") REFERENCES "candidateProjectMainStatuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_subStatusId_fkey" FOREIGN KEY ("subStatusId") REFERENCES "candidateProjectSubStatuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_mainStatusId_fkey" FOREIGN KEY ("mainStatusId") REFERENCES "candidateProjectMainStatuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_subStatusId_fkey" FOREIGN KEY ("subStatusId") REFERENCES "candidateProjectSubStatuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidateProjectSubStatuses" ADD CONSTRAINT "candidateProjectSubStatuses_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "candidateProjectMainStatuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
