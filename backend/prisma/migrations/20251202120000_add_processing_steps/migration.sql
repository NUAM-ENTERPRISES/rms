-- CreateEnum
CREATE TYPE "ProcessingStepKey" AS ENUM ('MEDICAL_CERTIFICATE', 'DOCUMENT_COLLECTION', 'HRD_ATTESTATION', 'QVP', 'DATAFLOW', 'PROMETRIC', 'VISA', 'IMMIGRATION', 'TICKETING', 'TRAVEL', 'JOINING');

-- CreateEnum
CREATE TYPE "ProcessingStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'REJECTED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "processing_steps" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "stepKey" "ProcessingStepKey" NOT NULL,
    "status" "ProcessingStepStatus" NOT NULL DEFAULT 'PENDING',
    "slaDays" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "notApplicableReason" TEXT,
    "lastUpdatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_step_history" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "stepKey" "ProcessingStepKey" NOT NULL,
    "previousStatus" "ProcessingStepStatus" NOT NULL,
    "newStatus" "ProcessingStepStatus" NOT NULL,
    "notes" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_step_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processing_steps_candidateProjectMapId_stepKey_key" ON "processing_steps"("candidateProjectMapId", "stepKey");

-- CreateIndex
CREATE INDEX "processing_steps_candidateProjectMapId_idx" ON "processing_steps"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "processing_steps_stepKey_idx" ON "processing_steps"("stepKey");

-- CreateIndex
CREATE INDEX "processing_step_history_candidateProjectMapId_idx" ON "processing_step_history"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "processing_step_history_stepKey_idx" ON "processing_step_history"("stepKey");

-- AddForeignKey
ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_history" ADD CONSTRAINT "processing_step_history_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_history" ADD CONSTRAINT "processing_step_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

