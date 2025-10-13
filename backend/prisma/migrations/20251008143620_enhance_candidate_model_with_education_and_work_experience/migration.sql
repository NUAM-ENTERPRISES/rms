/*
  Warnings:

  - You are about to drop the column `name` on the `candidates` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `candidates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `candidates` table without a default value. This is not possible if the table is not empty.
  - Made the column `dateOfBirth` on table `candidates` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."candidates" DROP COLUMN "name",
ADD COLUMN     "currentRole" TEXT,
ADD COLUMN     "currentSalary" INTEGER,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "gpa" DOUBLE PRECISION,
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "highestEducation" TEXT,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "totalExperience" INTEGER,
ADD COLUMN     "university" TEXT,
ALTER COLUMN "dateOfBirth" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."work_experiences" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "salary" INTEGER,
    "location" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "achievements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_experiences_candidateId_idx" ON "public"."work_experiences"("candidateId");

-- CreateIndex
CREATE INDEX "work_experiences_companyName_idx" ON "public"."work_experiences"("companyName");

-- CreateIndex
CREATE INDEX "work_experiences_jobTitle_idx" ON "public"."work_experiences"("jobTitle");

-- AddForeignKey
ALTER TABLE "public"."work_experiences" ADD CONSTRAINT "work_experiences_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
