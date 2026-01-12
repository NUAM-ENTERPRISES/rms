-- AlterTable
ALTER TABLE "country_document_requirements" ADD COLUMN     "processingStepTemplateId" TEXT;

-- CreateTable
CREATE TABLE "processing_step_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "hasDocuments" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_step_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_steps" (
    "id" TEXT NOT NULL,
    "processingCandidateId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_step_documents" (
    "id" TEXT NOT NULL,
    "processingStepId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_step_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processing_step_templates_key_key" ON "processing_step_templates"("key");

-- CreateIndex
CREATE INDEX "processing_step_templates_key_idx" ON "processing_step_templates"("key");

-- CreateIndex
CREATE INDEX "processing_step_templates_order_idx" ON "processing_step_templates"("order");

-- CreateIndex
CREATE INDEX "processing_steps_processingCandidateId_idx" ON "processing_steps"("processingCandidateId");

-- CreateIndex
CREATE INDEX "processing_steps_templateId_idx" ON "processing_steps"("templateId");

-- CreateIndex
CREATE INDEX "processing_steps_status_idx" ON "processing_steps"("status");

-- CreateIndex
CREATE INDEX "processing_steps_assignedTo_idx" ON "processing_steps"("assignedTo");

-- CreateIndex
CREATE INDEX "processing_step_documents_processingStepId_idx" ON "processing_step_documents"("processingStepId");

-- CreateIndex
CREATE INDEX "processing_step_documents_documentId_idx" ON "processing_step_documents"("documentId");

-- CreateIndex
CREATE INDEX "country_document_requirements_processingStepTemplateId_idx" ON "country_document_requirements"("processingStepTemplateId");

-- AddForeignKey
ALTER TABLE "country_document_requirements" ADD CONSTRAINT "country_document_requirements_processingStepTemplateId_fkey" FOREIGN KEY ("processingStepTemplateId") REFERENCES "processing_step_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_templates" ADD CONSTRAINT "processing_step_templates_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "processing_step_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_processingCandidateId_fkey" FOREIGN KEY ("processingCandidateId") REFERENCES "processing_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "processing_step_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_documents" ADD CONSTRAINT "processing_step_documents_processingStepId_fkey" FOREIGN KEY ("processingStepId") REFERENCES "processing_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_step_documents" ADD CONSTRAINT "processing_step_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
