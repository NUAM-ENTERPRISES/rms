-- CreateTable
CREATE TABLE "country_document_requirements" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_candidates" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleNeededId" TEXT NOT NULL,
    "assignedProcessingTeamUserId" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'assigned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_history" (
    "id" TEXT NOT NULL,
    "processingCandidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "country_document_requirements_countryCode_idx" ON "country_document_requirements"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "country_document_requirements_countryCode_docType_key" ON "country_document_requirements"("countryCode", "docType");

-- CreateIndex
CREATE INDEX "processing_candidates_candidateId_idx" ON "processing_candidates"("candidateId");

-- CreateIndex
CREATE INDEX "processing_candidates_projectId_idx" ON "processing_candidates"("projectId");

-- CreateIndex
CREATE INDEX "processing_candidates_roleNeededId_idx" ON "processing_candidates"("roleNeededId");

-- CreateIndex
CREATE INDEX "processing_candidates_assignedProcessingTeamUserId_idx" ON "processing_candidates"("assignedProcessingTeamUserId");

-- CreateIndex
CREATE UNIQUE INDEX "processing_candidates_candidateId_projectId_roleNeededId_key" ON "processing_candidates"("candidateId", "projectId", "roleNeededId");

-- CreateIndex
CREATE INDEX "processing_history_processingCandidateId_idx" ON "processing_history"("processingCandidateId");

-- CreateIndex
CREATE INDEX "processing_history_changedById_idx" ON "processing_history"("changedById");

-- AddForeignKey
ALTER TABLE "country_document_requirements" ADD CONSTRAINT "country_document_requirements_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_candidates" ADD CONSTRAINT "processing_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_candidates" ADD CONSTRAINT "processing_candidates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_candidates" ADD CONSTRAINT "processing_candidates_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "project_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_candidates" ADD CONSTRAINT "processing_candidates_assignedProcessingTeamUserId_fkey" FOREIGN KEY ("assignedProcessingTeamUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_history" ADD CONSTRAINT "processing_history_processingCandidateId_fkey" FOREIGN KEY ("processingCandidateId") REFERENCES "processing_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_history" ADD CONSTRAINT "processing_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
