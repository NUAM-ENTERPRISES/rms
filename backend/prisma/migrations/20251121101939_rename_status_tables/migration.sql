/*
  Warnings:

  - You are about to drop the `candidateProjectMainStatuses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `candidateProjectSubStatuses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."candidateProjectSubStatuses" DROP CONSTRAINT "candidateProjectSubStatuses_stageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_status_history" DROP CONSTRAINT "candidate_project_status_history_mainStatusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_project_status_history" DROP CONSTRAINT "candidate_project_status_history_subStatusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_projects" DROP CONSTRAINT "candidate_projects_mainStatusId_fkey";

-- DropForeignKey
ALTER TABLE "public"."candidate_projects" DROP CONSTRAINT "candidate_projects_subStatusId_fkey";

-- DropTable
DROP TABLE "public"."candidateProjectMainStatuses";

-- DropTable
DROP TABLE "public"."candidateProjectSubStatuses";

-- CreateTable
CREATE TABLE "candidate_project_main_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_project_main_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_project_sub_statuses" (
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

    CONSTRAINT "candidate_project_sub_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_main_statuses_name_key" ON "candidate_project_main_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_sub_statuses_name_key" ON "candidate_project_sub_statuses"("name");

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_mainStatusId_fkey" FOREIGN KEY ("mainStatusId") REFERENCES "candidate_project_main_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_subStatusId_fkey" FOREIGN KEY ("subStatusId") REFERENCES "candidate_project_sub_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_mainStatusId_fkey" FOREIGN KEY ("mainStatusId") REFERENCES "candidate_project_main_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_status_history" ADD CONSTRAINT "candidate_project_status_history_subStatusId_fkey" FOREIGN KEY ("subStatusId") REFERENCES "candidate_project_sub_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_sub_statuses" ADD CONSTRAINT "candidate_project_sub_statuses_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "candidate_project_main_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
