-- CreateTable
CREATE TABLE "candidate_import_batches" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'analyzing',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "readyRows" INTEGER NOT NULL DEFAULT 0,
    "reviewRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "sheetOwners" JSONB,
    "error" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_import_rows" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalized" JSONB NOT NULL,
    "mapping" JSONB,
    "issues" JSONB,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "recruiterId" TEXT,
    "candidateId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_document_bundles" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "pageCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_document_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_document_bundle_segments" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "docType" TEXT NOT NULL,
    "docName" TEXT,
    "confidence" DOUBLE PRECISION,
    "extracted" JSONB,
    "warnings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_document_bundle_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_import_batches_uploadedById_idx" ON "candidate_import_batches"("uploadedById");
CREATE INDEX "candidate_import_batches_status_idx" ON "candidate_import_batches"("status");
CREATE INDEX "candidate_import_batches_createdAt_idx" ON "candidate_import_batches"("createdAt");
CREATE INDEX "candidate_import_rows_batchId_idx" ON "candidate_import_rows"("batchId");
CREATE INDEX "candidate_import_rows_batchId_status_idx" ON "candidate_import_rows"("batchId", "status");
CREATE INDEX "candidate_import_rows_candidateId_idx" ON "candidate_import_rows"("candidateId");
CREATE INDEX "candidate_import_rows_recruiterId_idx" ON "candidate_import_rows"("recruiterId");
CREATE UNIQUE INDEX "candidate_import_rows_batchId_sheetName_rowNumber_key" ON "candidate_import_rows"("batchId", "sheetName", "rowNumber");
CREATE INDEX "candidate_document_bundles_candidateId_idx" ON "candidate_document_bundles"("candidateId");
CREATE INDEX "candidate_document_bundles_status_idx" ON "candidate_document_bundles"("status");
CREATE INDEX "candidate_document_bundles_uploadedById_idx" ON "candidate_document_bundles"("uploadedById");
CREATE INDEX "candidate_document_bundle_segments_bundleId_idx" ON "candidate_document_bundle_segments"("bundleId");
CREATE INDEX "candidate_document_bundle_segments_bundleId_status_idx" ON "candidate_document_bundle_segments"("bundleId", "status");
CREATE INDEX "candidate_document_bundle_segments_documentId_idx" ON "candidate_document_bundle_segments"("documentId");

-- AddForeignKey
ALTER TABLE "candidate_import_batches" ADD CONSTRAINT "candidate_import_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_import_rows" ADD CONSTRAINT "candidate_import_rows_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "candidate_import_rows" ADD CONSTRAINT "candidate_import_rows_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "candidate_import_rows" ADD CONSTRAINT "candidate_import_rows_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "candidate_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_document_bundles" ADD CONSTRAINT "candidate_document_bundles_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_document_bundles" ADD CONSTRAINT "candidate_document_bundles_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_document_bundle_segments" ADD CONSTRAINT "candidate_document_bundle_segments_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "candidate_document_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
