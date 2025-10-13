/*
  Warnings:

  - You are about to drop the column `assignedDate` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `selected` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `shortlisted` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `candidate_project_map` table. All the data in the column will be lost.
  - You are about to drop the column `candidateId` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `candidateId` on the `processing` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[candidateProjectMapId]` on the table `processing` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nominatedBy` to the `candidate_project_map` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidateProjectMapId` to the `interviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidateProjectMapId` to the `processing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."interviews" DROP CONSTRAINT "interviews_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."processing" DROP CONSTRAINT "processing_candidateId_fkey";

-- DropIndex
DROP INDEX "public"."processing_candidateId_key";

-- AlterTable
ALTER TABLE "public"."candidate_project_map" DROP COLUMN "assignedDate",
DROP COLUMN "selected",
DROP COLUMN "shortlisted",
DROP COLUMN "verified",
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "approvedDate" TIMESTAMP(3),
ADD COLUMN     "documentsSubmittedDate" TIMESTAMP(3),
ADD COLUMN     "documentsVerifiedDate" TIMESTAMP(3),
ADD COLUMN     "hiredDate" TIMESTAMP(3),
ADD COLUMN     "nominatedBy" TEXT NOT NULL,
ADD COLUMN     "nominatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectedDate" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "selectedDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'nominated';

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."interviews" DROP COLUMN "candidateId",
DROP COLUMN "projectId",
ADD COLUMN     "candidateProjectMapId" TEXT NOT NULL,
ADD COLUMN     "interviewerEmail" TEXT,
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "mode" TEXT DEFAULT 'video';

-- AlterTable
ALTER TABLE "public"."processing" DROP COLUMN "candidateId",
ADD COLUMN     "actualJoiningDate" TIMESTAMP(3),
ADD COLUMN     "arrivalDate" TIMESTAMP(3),
ADD COLUMN     "candidateProjectMapId" TEXT NOT NULL,
ADD COLUMN     "departureDate" TIMESTAMP(3),
ADD COLUMN     "expectedJoiningDate" TIMESTAMP(3),
ADD COLUMN     "flightBookedDate" TIMESTAMP(3),
ADD COLUMN     "joiningNotes" TEXT,
ADD COLUMN     "joiningStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "medicalClearance" TEXT,
ADD COLUMN     "medicalCompletionDate" TIMESTAMP(3),
ADD COLUMN     "medicalNotes" TEXT,
ADD COLUMN     "medicalStartDate" TIMESTAMP(3),
ADD COLUMN     "qvpCompletionDate" TIMESTAMP(3),
ADD COLUMN     "qvpStartDate" TIMESTAMP(3),
ADD COLUMN     "travelNotes" TEXT,
ADD COLUMN     "visaApplicationDate" TIMESTAMP(3),
ADD COLUMN     "visaApprovalDate" TIMESTAMP(3),
ADD COLUMN     "visaExpiryDate" TIMESTAMP(3),
ADD COLUMN     "visaNotes" TEXT,
ADD COLUMN     "visaType" TEXT,
ALTER COLUMN "qvpStatus" SET DEFAULT 'not_started',
ALTER COLUMN "medicalStatus" SET DEFAULT 'not_started',
ALTER COLUMN "visaStatus" SET DEFAULT 'not_started',
ALTER COLUMN "travelStatus" SET DEFAULT 'not_started';

-- CreateTable
CREATE TABLE "public"."document_requirements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."candidate_project_document_verifications" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "rejectionReason" TEXT,
    "resubmissionRequested" BOOLEAN NOT NULL DEFAULT false,
    "resubmissionRequestedAt" TIMESTAMP(3),
    "resubmissionRequestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_project_document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_requirements_projectId_idx" ON "public"."document_requirements"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_projectId_docType_key" ON "public"."document_requirements"("projectId", "docType");

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_candidateProjectMa_idx" ON "public"."candidate_project_document_verifications"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_documentId_idx" ON "public"."candidate_project_document_verifications"("documentId");

-- CreateIndex
CREATE INDEX "candidate_project_document_verifications_status_idx" ON "public"."candidate_project_document_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_document_verifications_candidateProjectMa_key" ON "public"."candidate_project_document_verifications"("candidateProjectMapId", "documentId");

-- CreateIndex
CREATE INDEX "candidate_project_map_status_idx" ON "public"."candidate_project_map"("status");

-- CreateIndex
CREATE INDEX "candidate_project_map_nominatedBy_idx" ON "public"."candidate_project_map"("nominatedBy");

-- CreateIndex
CREATE INDEX "candidates_assignedTo_idx" ON "public"."candidates"("assignedTo");

-- CreateIndex
CREATE INDEX "candidates_teamId_idx" ON "public"."candidates"("teamId");

-- CreateIndex
CREATE INDEX "candidates_currentStatus_idx" ON "public"."candidates"("currentStatus");

-- CreateIndex
CREATE INDEX "documents_candidateId_idx" ON "public"."documents"("candidateId");

-- CreateIndex
CREATE INDEX "documents_docType_idx" ON "public"."documents"("docType");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "public"."documents"("status");

-- CreateIndex
CREATE INDEX "interviews_candidateProjectMapId_idx" ON "public"."interviews"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "interviews_scheduledTime_idx" ON "public"."interviews"("scheduledTime");

-- CreateIndex
CREATE UNIQUE INDEX "processing_candidateProjectMapId_key" ON "public"."processing"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "processing_candidateProjectMapId_idx" ON "public"."processing"("candidateProjectMapId");

-- AddForeignKey
ALTER TABLE "public"."interviews" ADD CONSTRAINT "interviews_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "public"."candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processing" ADD CONSTRAINT "processing_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "public"."candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_requirements" ADD CONSTRAINT "document_requirements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_candidateProjectM_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "public"."candidate_project_map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."candidate_project_document_verifications" ADD CONSTRAINT "candidate_project_document_verifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
