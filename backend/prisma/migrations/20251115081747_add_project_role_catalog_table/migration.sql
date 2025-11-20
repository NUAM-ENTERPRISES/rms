/*
  Warnings:

  - You are about to drop the `roles_needed` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."candidate_project_map" DROP CONSTRAINT "candidate_project_map_roleNeededId_fkey";

-- DropForeignKey
ALTER TABLE "public"."role_needed_education_requirements" DROP CONSTRAINT "role_needed_education_requirements_roleNeededId_fkey";

-- DropForeignKey
ALTER TABLE "public"."roles_needed" DROP CONSTRAINT "roles_needed_projectId_fkey";

-- DropTable
DROP TABLE "public"."roles_needed";

-- CreateTable
CREATE TABLE "project_roles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "minExperience" INTEGER,
    "maxExperience" INTEGER,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalRequirements" TEXT,
    "backgroundCheckRequired" BOOLEAN NOT NULL DEFAULT true,
    "benefits" TEXT,
    "drugScreeningRequired" BOOLEAN NOT NULL DEFAULT true,
    "educationRequirements" JSONB,
    "institutionRequirements" TEXT,
    "languageRequirements" JSONB,
    "licenseRequirements" JSONB,
    "notes" TEXT,
    "onCallRequired" BOOLEAN NOT NULL DEFAULT false,
    "physicalDemands" TEXT,
    "relocationAssistance" BOOLEAN NOT NULL DEFAULT false,
    "requiredCertifications" JSONB,
    "salaryRange" JSONB,
    "shiftType" TEXT,
    "specificExperience" JSONB,
    "employmentType" TEXT NOT NULL DEFAULT 'permanent',
    "contractDurationYears" INTEGER,
    "genderRequirement" TEXT NOT NULL DEFAULT 'all',
    "technicalSkills" JSONB,
    "visaType" TEXT NOT NULL DEFAULT 'contract',
    "requiredSkills" JSONB NOT NULL DEFAULT '[]',
    "candidateStates" JSONB NOT NULL DEFAULT '[]',
    "candidateReligions" JSONB NOT NULL DEFAULT '[]',
    "minHeight" DOUBLE PRECISION,
    "maxHeight" DOUBLE PRECISION,
    "minWeight" DOUBLE PRECISION,
    "maxWeight" DOUBLE PRECISION,

    CONSTRAINT "project_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_role_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_role_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_role_catalog_name_key" ON "project_role_catalog"("name");

-- CreateIndex
CREATE INDEX "project_role_catalog_category_idx" ON "project_role_catalog"("category");

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "project_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_needed_education_requirements" ADD CONSTRAINT "role_needed_education_requirements_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "project_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
