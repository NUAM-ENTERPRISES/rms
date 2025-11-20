/*
  Warnings:

  - You are about to drop the column `rejectedAt` on the `candidate_project_document_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedBy` on the `candidate_project_document_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `resubmissionRequestedAt` on the `candidate_project_document_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `resubmissionRequestedBy` on the `candidate_project_document_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `candidate_project_document_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `candidate_project_document_verifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidate_project_document_verifications" DROP COLUMN "rejectedAt",
DROP COLUMN "rejectedBy",
DROP COLUMN "resubmissionRequestedAt",
DROP COLUMN "resubmissionRequestedBy",
DROP COLUMN "verifiedAt",
DROP COLUMN "verifiedBy";

-- CreateTable
CREATE TABLE "document_verification_history" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedByName" TEXT,
    "notes" TEXT,
    "reason" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_verification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_verification_history_verificationId_idx" ON "document_verification_history"("verificationId");

-- CreateIndex
CREATE INDEX "document_verification_history_performedBy_idx" ON "document_verification_history"("performedBy");

-- CreateIndex
CREATE INDEX "document_verification_history_action_idx" ON "document_verification_history"("action");

-- CreateIndex
CREATE INDEX "document_verification_history_performedAt_idx" ON "document_verification_history"("performedAt");

-- AddForeignKey
ALTER TABLE "document_verification_history" ADD CONSTRAINT "document_verification_history_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "candidate_project_document_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_verification_history" ADD CONSTRAINT "document_verification_history_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
